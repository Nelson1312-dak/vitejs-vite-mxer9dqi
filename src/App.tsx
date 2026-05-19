import React, { useState, useEffect, useMemo } from 'react';
import {
  Info, BarChart3, Calculator, BookOpen,
  TrendingUp, Shield, ArrowRight, X, LayoutDashboard, PieChart, ChevronRight
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Stock {
  ticker: string; name: string; price: number; pe: number;
  divYield: number; revenueGrowth: number; stabilityScore: number; category: string;
}
interface Portfolio {
  targets: Record<string, number>;
  setTargets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleTargetChange: (asset: string, val: string) => void;
  expectedReturn: number;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const formatVND = (n: number) => {
  if (isNaN(n) || !isFinite(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
};
const formatPct = (d: number) => isNaN(d) ? '0.00%' : (d * 100).toFixed(2) + '%';
const formatShort = (n: number): string => {
  if (isNaN(n) || !isFinite(n) || n === 0) return '0';
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  if (Math.abs(n) >= 1_000_000) return Math.round(n / 1_000_000) + ' tr';
  return n.toLocaleString('vi-VN');
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ASSET_RETURNS: Record<string, number> = {
  vnStocks: 12, gold: 8, crypto: 15, bonds: 8, funds: 10, cash: 5,
};
const ASSET_COLORS: Record<string, string> = {
  vnStocks: '#F7931A', gold: '#C9961B', crypto: '#627EEA',
  bonds: '#0052FF',   funds: '#00AC4F', cash:   '#8A919E',
};
const ASSET_LABELS: Record<string, string> = {
  vnStocks: 'VN Stocks', gold: 'Gold (SJC)', crypto: 'Crypto',
  bonds: 'Trái phiếu',  funds: 'Quỹ mở',    cash:   'Money Market',
};
const PRESET_PROFILES = [
  { label: 'Conservative', t: { vnStocks: 10, gold: 20, crypto: 0,  bonds: 30, funds: 10, cash: 30 } },
  { label: 'Moderate',     t: { vnStocks: 30, gold: 15, crypto: 5,  bonds: 20, funds: 15, cash: 15 } },
  { label: 'Aggressive',   t: { vnStocks: 50, gold: 5,  crypto: 15, bonds: 5,  funds: 15, cash: 10 } },
  { label: 'All-Weather',  t: { vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20 } },
];

// ─── HOOKS ────────────────────────────────────────────────────────────────────
const useMarketData = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState({ vnIndex: 1250.45, vn30: 1265.10, goldSJC: 82500000, usdtVnd: 25450 });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(false);
  const tickers = ['FPT', 'VCB', 'VNM', 'HPG', 'TCB', 'MWG'];

  useEffect(() => {
    const nameMap: Record<string, string> = {
      FPT: 'FPT Corp', VCB: 'Vietcombank', VNM: 'Vinamilk',
      HPG: 'Hoa Phat', TCB: 'Techcombank', MWG: 'Mobile World',
    };
    const fetch_ = async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch(`https://services.entrade.com.vn/chart-api/v2/quotes?symbols=${tickers.join(',')}`),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin&vs_currencies=vnd'),
        ]);
        const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
        if (sData?.data) {
          setStocks(tickers.map(t => {
            const d = sData.data.find((x: any) => x.symbol === t);
            return { ticker: t, name: nameMap[t] || t, price: d?.lastPrice ?? 0, pe: d ? 15.5 : 0, divYield: 0.03, revenueGrowth: 0.15, stabilityScore: 8, category: 'Market' };
          }));
        }
        setMarketIndices(p => ({ ...p, usdtVnd: cData.tether?.vnd || 25450, vnIndex: p.vnIndex + (Math.random() - 0.5) * 2 }));
        setIsLive(true);
      } catch { setIsLive(false); }
      setLastUpdated(new Date());
    };
    fetch_();
    const id = setInterval(fetch_, 10000);
    return () => clearInterval(id);
  }, []);

  return { stocks, marketIndices, lastUpdated, isLive };
};

const usePortfolio = () => {
  const [targets, setTargets] = useState<Record<string, number>>({
    vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20,
  });
  const handleTargetChange = (asset: string, valStr: string) => {
    let newVal = parseFloat(valStr);
    if (isNaN(newVal)) newVal = 0;
    newVal = Math.max(0, Math.min(100, newVal));
    setTargets(prev => {
      const diff = newVal - (prev[asset] || 0);
      const next = { ...prev, [asset]: newVal };
      const others = Object.keys(prev).filter(a => a !== asset);
      const otherSum = others.reduce((s, a) => s + prev[a], 0);
      if (otherSum === 0) {
        const split = (100 - newVal) / (others.length || 1);
        others.forEach(a => (next[a] = split));
      } else if (diff !== 0) {
        others.forEach(a => { next[a] = Math.max(0, prev[a] - diff * (prev[a] / otherSum)); });
      }
      let sum = Object.values(next).reduce((a: number, b) => a + (isNaN(b) ? 0 : b), 0);
      if (Math.abs(sum - 100) > 0.01 && others.length > 0) next[others[0]] += 100 - sum;
      Object.keys(next).forEach(k => { next[k] = Math.round((isNaN(next[k]) ? 0 : next[k]) * 10) / 10; });
      return next;
    });
  };
  const expectedReturn = Object.keys(targets).reduce((s, a) => s + (targets[a] / 100) * ASSET_RETURNS[a], 0);
  return { targets, setTargets, handleTargetChange, expectedReturn };
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getRiskProfile = (targets: Record<string, number>) => {
  const h = (targets.vnStocks || 0) + (targets.crypto || 0);
  if (h <= 15) return { label: 'Conservative',    cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (h <= 35) return { label: 'Moderate',        cls: 'text-[#0052FF] bg-[#EBF0FF] border-blue-200' };
  if (h <= 55) return { label: 'Aggressive',      cls: 'text-orange-600 bg-orange-50 border-orange-200' };
  return              { label: 'Very Aggressive', cls: 'text-red-600 bg-red-50 border-red-200' };
};

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-[#EAECEF] rounded-xl shadow-sm ${className}`}>{children}</div>
);

const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
  <div className="relative group flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-60 p-3 bg-[#0A0B0D] text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none leading-relaxed">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0A0B0D]" />
    </div>
  </div>
);

const NumberInput = ({ value, onChange, className, placeholder = '0' }: {
  value: string | number; onChange: (v: number | string) => void; className?: string; placeholder?: string;
}) => {
  const display = value === '' || value === null || isNaN(Number(value)) ? '' : Number(value).toLocaleString('en-US');
  return (
    <input
      type="text" inputMode="numeric" value={display} placeholder={placeholder} className={className}
      onChange={e => {
        const raw = e.target.value.replace(/,/g, '');
        onChange(raw === '' ? '' : isNaN(Number(raw)) ? value : Number(raw));
      }}
    />
  );
};

// ─── VISUAL COMPONENTS ────────────────────────────────────────────────────────

// Thin stacked bar showing allocation proportions
const AllocationBar = ({ targets }: { targets: Record<string, number> }) => {
  const total = Object.values(targets).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden">
      {Object.entries(targets).filter(([, v]) => v > 0.5).map(([k, v]) => (
        <div key={k} title={`${ASSET_LABELS[k]}: ${v.toFixed(1)}%`}
          style={{ width: `${(v / total) * 100}%`, backgroundColor: ASSET_COLORS[k] }}
          className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
        />
      ))}
    </div>
  );
};

// Donut chart with expected return in center
const DonutChart = ({ targets, expectedReturn }: { targets: Record<string, number>; expectedReturn: number }) => {
  const total = Object.values(targets).reduce((a, b) => a + b, 0) || 1;
  const r = 50, circ = 2 * Math.PI * r, GAP = circ * 0.015;
  let cum = 0;
  const segs = Object.entries(targets).filter(([, v]) => v > 0.5).map(([k, v]) => {
    const pct = v / total, segLen = Math.max(0, pct * circ - GAP), rot = cum * 360 - 90;
    cum += pct;
    return { k, segLen, rot, color: ASSET_COLORS[k] || '#8A919E' };
  });
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#F7F8FA" strokeWidth="20" />
      {segs.map(s => (
        <circle key={s.k} cx="70" cy="70" r={r} fill="none" stroke={s.color}
          strokeWidth="20" strokeDasharray={`${s.segLen} ${circ - s.segLen}`}
          transform={`rotate(${s.rot} 70 70)`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }}
        />
      ))}
      <text x="70" y="64" textAnchor="middle" fill="#0A0B0D" fontSize="21" fontWeight="700" fontFamily="Inter, system-ui">{expectedReturn.toFixed(1)}%</text>
      <text x="70" y="80" textAnchor="middle" fill="#8A919E" fontSize="8.5" letterSpacing="1.5" fontFamily="Inter, system-ui">RETURN/NĂM</text>
    </svg>
  );
};

// Bar chart showing portfolio value at milestone years
const MilestoneChart = ({ initial, monthly, rate, maxYears }: {
  initial: number; monthly: number; rate: number; maxYears: number;
}) => {
  const yrs = [1, 2, 3, 5, 7, 10, 15, 20].filter(y => y <= Math.max(maxYears, 1));
  const r = rate / 100 / 12;
  const val = (y: number) => {
    let t = initial;
    for (let i = 0; i < y * 12; i++) t = (t + monthly) * (1 + r);
    return t;
  };
  const data = yrs.map(y => ({ y, v: val(y) }));
  const maxV = data[data.length - 1]?.v || 1;

  return (
    <div>
      <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-3">Tăng trưởng theo mốc năm</div>
      <div className="flex items-end gap-1.5 h-20 relative">
        {data.map((m, i) => {
          const h = Math.max(4, (m.v / maxV) * 100);
          const isLast = i === data.length - 1;
          return (
            <div key={m.y} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap hidden group-hover:flex items-center gap-1 bg-[#0A0B0D] text-white text-[10px] font-medium rounded-md px-2 py-1 z-10">
                {formatShort(m.v)} ₫
              </div>
              <div
                className={`w-full rounded-t-sm transition-all duration-500 ${isLast ? 'bg-[#0052FF]' : 'bg-[#EBF0FF] group-hover:bg-[#0052FF]/30'}`}
                style={{ height: `${h}%` }}
              />
              <span className={`text-[9px] font-semibold ${isLast ? 'text-[#0052FF]' : 'text-[#8A919E]'}`}>Y{m.y}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── VIEWS ────────────────────────────────────────────────────────────────────

const UnifiedWealthDashboard = ({ portfolio }: { portfolio: Portfolio }) => {
  const { targets, handleTargetChange, expectedReturn } = portfolio;
  const [capital, setCapital] = useState<number | string>(100_000_000);
  const [goal, setGoal] = useState<number | string>(3_000_000_000);
  const [years, setYears] = useState<number | string>(10);

  const r = expectedReturn / 100 / 12;
  const n = Math.max(Number(years), 0.1) * 12;
  const pv = Number(capital) || 0, fv = Number(goal) || 0;
  const isReached = pv >= fv;

  let monthly = 0;
  if (!isReached) {
    monthly = r > 0
      ? (fv - pv * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n) - 1) / r)
      : (fv - pv) / n;
  }
  const validMonthly = Math.max(0, monthly);
  const isInfinite = !isFinite(monthly) || monthly < 0;

  const principal = pv + validMonthly * n;
  const interest = Math.max(0, fv - principal);
  const principalPct = fv === 0 ? 0 : Math.min(100, (principal / fv) * 100);
  const risk = getRiskProfile(targets);

  const breakdown = Object.keys(targets).map(a => ({
    asset: a,
    pct: targets[a],
    capitalAmt: pv * (targets[a] / 100),
    monthlyAmt: validMonthly * (targets[a] / 100),
  }));

  const inputCls = "w-full px-3 py-2.5 text-sm font-medium text-[#0A0B0D] bg-[#F7F8FA] border border-[#EAECEF] rounded-lg focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-2 focus:ring-[#0052FF]/10 transition-all tabular-nums";

  return (
    <div className="space-y-4">

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Vốn hiện tại', value: formatShort(pv) + ' ₫', sub: 'Tổng tích lũy' },
          {
            label: 'Cần/tháng',
            value: isReached ? 'Đã đạt!' : isInfinite ? '—' : formatShort(validMonthly) + ' ₫',
            sub: 'Số tiền tiết kiệm', accent: !isReached && !isInfinite,
          },
          { label: 'Tỷ suất KV', value: expectedReturn.toFixed(1) + '%', sub: 'Kỳ vọng mỗi năm' },
          { label: 'Thời gian', value: years + ' năm', sub: 'Đến mục tiêu' },
        ].map((k, i) => (
          <Card key={i} className="p-4">
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1">{k.label}</div>
            <div className={`text-lg font-bold tabular-nums ${k.accent ? 'text-[#0052FF]' : 'text-[#0A0B0D]'}`}>{k.value}</div>
            <div className="text-xs text-[#8A919E] mt-0.5">{k.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Inputs */}
        <Card className="p-5">
          <div className="mb-4 pb-3 border-b border-[#EAECEF]">
            <h3 className="text-sm font-semibold text-[#0A0B0D]">Thông số đầu vào</h3>
            <p className="text-xs text-[#8A919E] mt-0.5">Xác định trạng thái hiện tại và mục tiêu.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Tổng tích lũy hiện có (₫)</label>
              <NumberInput value={capital} onChange={setCapital} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Mục tiêu tài sản (₫)</label>
              <NumberInput value={goal} onChange={setGoal} className={inputCls} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#5B616E]">Thời gian kỳ vọng</label>
                <span className="text-xs font-bold text-[#0052FF] tabular-nums">{years} năm</span>
              </div>
              <input
                type="range" min="1" max="40" step="1" value={Number(years)}
                onChange={e => setYears(Number(e.target.value))}
                className="w-full h-1.5 rounded-full cursor-pointer accent-[#0052FF] bg-[#EAECEF]"
              />
              <div className="flex justify-between text-[10px] text-[#8A919E] mt-1">
                <span>1 năm</span><span>40 năm</span>
              </div>
            </div>

            {/* Compound breakdown */}
            {!isInfinite && !isReached && (
              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#EAECEF]">
                <div className="flex justify-between text-xs text-[#5B616E] mb-2">
                  <span>Vốn gốc</span>
                  <span className="font-semibold text-[#0A0B0D] tabular-nums">{formatShort(principal)} ₫</span>
                </div>
                <div className="h-1.5 bg-[#EAECEF] rounded-full overflow-hidden flex mb-2">
                  <div style={{ width: `${principalPct}%` }} className="bg-[#5B616E] rounded-l-full transition-all duration-700" />
                  <div style={{ width: `${100 - principalPct}%` }} className="bg-[#05B169] rounded-r-full transition-all duration-700" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8A919E]">Lợi nhuận kép</span>
                  <span className="font-semibold text-[#05B169] tabular-nums">+{formatShort(interest)} ₫</span>
                </div>
              </div>
            )}

            {isReached && (
              <div className="p-3 bg-[#E6F9F1] rounded-lg border border-emerald-200 text-sm font-semibold text-emerald-700">
                Mục tiêu đã đạt — vốn hiện tại đủ để hoàn thành.
              </div>
            )}
          </div>
        </Card>

        {/* Allocation */}
        <Card className="p-5">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#EAECEF]">
            <div>
              <h3 className="text-sm font-semibold text-[#0A0B0D]">Chiến lược phân bổ</h3>
              <p className="text-xs text-[#8A919E] mt-0.5">Cân bằng rủi ro & lợi nhuận kỳ vọng.</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${risk.cls}`}>
              {risk.label}
            </span>
          </div>

          {/* Donut + Legend */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 flex-shrink-0">
              <DonutChart targets={targets} expectedReturn={expectedReturn} />
            </div>
            <div className="flex-1 space-y-1.5">
              {Object.keys(targets).map(a => (
                <div key={a} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[a] }} />
                  <span className="text-[#5B616E] flex-1 truncate">{ASSET_LABELS[a]}</span>
                  <span className="font-semibold text-[#0A0B0D] tabular-nums w-9 text-right">{targets[a].toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stacked allocation bar */}
          <div className="mb-4">
            <AllocationBar targets={targets} />
          </div>

          {/* Preset buttons */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {PRESET_PROFILES.map(p => (
              <button key={p.label} onClick={() => portfolio.setTargets(p.t)}
                className="px-3 py-1 text-xs font-medium text-[#5B616E] bg-[#F7F8FA] hover:bg-[#EBF0FF] hover:text-[#0052FF] border border-[#EAECEF] hover:border-[#0052FF]/30 rounded-lg transition-all">
                {p.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            {Object.keys(targets).map(a => (
              <div key={a} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[a] }} />
                <span className="text-xs text-[#5B616E] w-20 flex-shrink-0 truncate">{ASSET_LABELS[a]}</span>
                <input type="range" min="0" max="100" step="0.5"
                  value={targets[a]} onChange={e => handleTargetChange(a, e.target.value)}
                  className="flex-1 h-1.5 rounded-full cursor-pointer bg-[#EAECEF]"
                  style={{ accentColor: ASSET_COLORS[a] }}
                />
                <span className="text-xs font-bold text-[#0A0B0D] tabular-nums w-9 text-right">{targets[a].toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Disbursement table */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#EAECEF]">
          <h3 className="text-sm font-semibold text-[#0A0B0D]">Kế hoạch giải ngân</h3>
          <Tooltip content="Phân tích toán học cách phân bổ vốn vào từng lớp tài sản dựa trên tỷ lệ mục tiêu.">
            <Info size={14} className="text-[#8A919E] cursor-help" />
          </Tooltip>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#F7F8FA] border-b border-[#EAECEF]">
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Lớp tài sản</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Tỷ trọng</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Vốn ban đầu</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Đầu tư/tháng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECEF]">
            {breakdown.map(row => (
              <tr key={row.asset} className="hover:bg-[#F7F8FA] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[row.asset] }} />
                    <span className="text-sm font-medium text-[#0A0B0D]">{ASSET_LABELS[row.asset]}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="inline-block text-xs font-semibold text-[#5B616E] bg-[#F7F8FA] border border-[#EAECEF] rounded-md px-2 py-0.5 tabular-nums">
                    {row.pct.toFixed(1)}%
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-[#5B616E] font-medium tabular-nums">
                  {formatVND(row.capitalAmt)}
                </td>
                <td className="px-5 py-3.5 text-right text-sm font-bold text-[#05B169] tabular-nums">
                  +{formatVND(row.monthlyAmt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── STOCK SCREENER ────────────────────────────────────────────────────────────
const StockScreener = ({ stocks }: { stocks: Stock[] }) => {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    if (filter === 'value')     return stocks.filter(s => s.pe < 15 && s.divYield > 0.03);
    if (filter === 'growth')    return stocks.filter(s => s.revenueGrowth >= 0.15);
    if (filter === 'stability') return stocks.filter(s => s.stabilityScore >= 8);
    return stocks;
  }, [stocks, filter]);

  const FILTERS = [
    { id: 'all',       label: 'Tất cả' },
    { id: 'value',     label: 'Value' },
    { id: 'growth',    label: 'Tăng trưởng' },
    { id: 'stability', label: 'Ổn định' },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap gap-4 justify-between items-center px-5 py-4 border-b border-[#EAECEF]">
        <div>
          <h2 className="text-sm font-semibold text-[#0A0B0D]">Bảng giá VN Stocks</h2>
          <p className="text-xs text-[#8A919E] mt-0.5">Real-time từ HOSE/HNX qua API DNSE</p>
        </div>
        <div className="flex gap-1 bg-[#F7F8FA] p-1 rounded-lg border border-[#EAECEF]">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === f.id ? 'bg-white text-[#0A0B0D] shadow-sm border border-[#EAECEF]' : 'text-[#8A919E] hover:text-[#5B616E]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="bg-[#F7F8FA] border-b border-[#EAECEF]">
            <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Mã / Tên</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Giá</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest hidden sm:table-cell">P/E</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest hidden sm:table-cell">Cổ tức</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Tăng trưởng</th>
            <th className="px-5 py-3 text-center text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest hidden md:table-cell">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EAECEF]">
          {filtered.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#8A919E]">Không có kết quả phù hợp.</td></tr>
          ) : filtered.map(s => (
            <tr key={s.ticker} className="hover:bg-[#F7F8FA] transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#EAECEF] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#F7931A]">{s.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#0A0B0D]">{s.ticker}</div>
                    <div className="text-xs text-[#8A919E]">{s.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-[#0A0B0D]">
                {s.price > 0 ? formatVND(s.price) : <span className="text-[#8A919E] font-normal text-xs">Đang tải…</span>}
              </td>
              <td className="px-5 py-3.5 text-right text-sm tabular-nums text-[#5B616E] hidden sm:table-cell">
                {s.pe > 0 ? s.pe.toFixed(1) : '—'}
              </td>
              <td className="px-5 py-3.5 text-right text-sm tabular-nums text-[#5B616E] hidden sm:table-cell">
                {formatPct(s.divYield)}
              </td>
              <td className="px-5 py-3.5 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#05B169]">
                  <TrendingUp size={11} />
                  {formatPct(s.revenueGrowth)}
                </span>
              </td>
              <td className="px-5 py-3.5 text-center hidden md:table-cell">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                  s.stabilityScore >= 8 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-[#F7F8FA] text-[#5B616E] border border-[#EAECEF]'
                }`}>
                  {s.stabilityScore}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// ─── COMPOUND CALCULATOR ───────────────────────────────────────────────────────
const CompoundCalculator = () => {
  const [initial, setInitial] = useState<number | string>(10_000_000);
  const [monthly, setMonthly] = useState<number | string>(5_000_000);
  const [rate, setRate] = useState<number | string>(8.5);
  const [years, setYears] = useState<number | string>(10);

  const calcFinal = (y = Number(years)) => {
    let t = Number(initial);
    const r = Number(rate) / 100 / 12;
    for (let i = 0; i < y * 12; i++) t = (t + Number(monthly)) * (1 + r);
    return t;
  };
  const invested = Number(initial) + Number(monthly) * 12 * Number(years);
  const finalVal = calcFinal();
  const profit = finalVal - invested;
  const principalPct = finalVal > 0 ? Math.min(100, (invested / finalVal) * 100) : 0;
  const mult = invested > 0 ? finalVal / invested : 1;

  const inputCls = "w-full px-3 py-2.5 text-sm font-medium text-[#0A0B0D] bg-[#F7F8FA] border border-[#EAECEF] rounded-lg focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-2 focus:ring-[#0052FF]/10 transition-all tabular-nums";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Inputs */}
        <Card className="p-5">
          <div className="mb-4 pb-3 border-b border-[#EAECEF]">
            <h2 className="text-sm font-semibold text-[#0A0B0D]">Compound Interest Engine</h2>
            <p className="text-xs text-[#8A919E] mt-0.5">Tính tăng trưởng dài hạn — đầu tư định kỳ vào quỹ mở.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Vốn ban đầu (₫)</label>
              <NumberInput value={initial} onChange={setInitial} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Góp mỗi tháng (₫)</label>
              <NumberInput value={monthly} onChange={setMonthly} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Lãi suất (%/năm)</label>
                <input type="number" step="0.1" value={Number(rate)} onChange={e => setRate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5B616E] mb-1.5">Số năm</label>
                <input type="number" value={Number(years)} onChange={e => setYears(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
          </div>
        </Card>

        {/* Result */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1">Giá trị tương lai</div>
            <div className="text-3xl font-bold text-[#0A0B0D] tabular-nums mb-2">{formatVND(finalVal)}</div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0052FF] bg-[#EBF0FF] border border-blue-200 rounded-lg px-2.5 py-1">
              <TrendingUp size={11} />
              ×{mult.toFixed(1)} so với vốn nạp vào
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#8A919E]">Tổng vốn nạp</span>
                <span className="font-semibold text-[#0A0B0D] tabular-nums">{formatVND(invested)}</span>
              </div>
              <div className="h-1.5 bg-[#EAECEF] rounded-full overflow-hidden">
                <div className="h-full bg-[#5B616E] rounded-full transition-all duration-700" style={{ width: `${principalPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#8A919E]">Lãi kép tích lũy</span>
                <span className="font-semibold text-[#05B169] tabular-nums">+{formatVND(profit)}</span>
              </div>
              <div className="h-1.5 bg-[#EAECEF] rounded-full overflow-hidden">
                <div className="h-full bg-[#05B169] rounded-full transition-all duration-700" style={{ width: `${100 - principalPct}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Milestone chart */}
      <Card className="p-5">
        <MilestoneChart
          initial={Number(initial)} monthly={Number(monthly)}
          rate={Number(rate)} maxYears={Number(years)}
        />
      </Card>
    </div>
  );
};

// ─── ASSET EXPLORER ───────────────────────────────────────────────────────────
const AssetExplorer = ({ selectedAsset, onClose }: { selectedAsset: string | null; onClose: () => void }) => {
  if (!selectedAsset) return null;
  const data: Record<string, { title: string; def: string; risk: string; riskCls: string; platforms: string[]; tip: string }> = {
    stocks: { title: 'Cổ phiếu Việt Nam', def: 'Sở hữu một phần doanh nghiệp niêm yết trên HOSE, HNX thông qua sàn giao dịch.', risk: 'Cao — Biến động theo thị trường và chu kỳ kinh tế.', riskCls: 'text-orange-600 bg-orange-50 border-orange-200', platforms: ['DNSE', 'TCBS', 'SSI', 'VNDirect'], tip: 'Chỉ số VN-Index bị ảnh hưởng lớn bởi nhóm Ngân hàng và Bất động sản.' },
    gold:   { title: 'Vàng vật chất & Online', def: 'Tài sản trú ẩn an toàn, được ưa chuộng tại VN để chống lạm phát.', risk: 'Trung bình — Rủi ro lưu trữ; phụ thuộc giá thế giới.', riskCls: 'text-amber-600 bg-amber-50 border-amber-200', platforms: ['DOJI', 'SJC', 'PNJ eGold'], tip: 'Vàng SJC thường có độ chênh lệch cao so với giá vàng thế giới.' },
    crypto: { title: 'Tài sản số (Crypto)', def: 'Các loại tiền mã hóa và token công nghệ blockchain.', risk: 'Rất cao — Biến động cực lớn và rủi ro pháp lý.', riskCls: 'text-red-600 bg-red-50 border-red-200', platforms: ['Binance', 'OKX', 'Remitano'], tip: 'Việt Nam có tỷ lệ chấp nhận crypto cao nhất thế giới.' },
    bonds:  { title: 'Trái phiếu doanh nghiệp', def: 'Công cụ nợ được phát hành bởi DN hoặc Chính phủ để huy động vốn.', risk: 'Trung bình — Phụ thuộc khả năng thanh toán của tổ chức phát hành.', riskCls: 'text-[#0052FF] bg-[#EBF0FF] border-blue-200', platforms: ['iBond (TCBS)', 'D-Bond (VNDirect)'], tip: 'Trái phiếu doanh nghiệp có lợi suất cao hơn nhưng đi kèm rủi ro nợ xấu.' },
    funds:  { title: 'Quỹ Mở (Mutual Funds)', def: 'Danh mục đầu tư được quản lý bởi chuyên gia tài chính.', risk: 'Thấp đến Trung bình — Tùy loại quỹ (Cổ phiếu hay Trái phiếu).', riskCls: 'text-emerald-700 bg-emerald-50 border-emerald-200', platforms: ['Dragon Capital', 'VinaCapital', 'Fmarket'], tip: 'Phù hợp cho chiến lược DCA (Đầu tư định kỳ) tự động.' },
  };
  const d = data[selectedAsset];
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 overflow-y-auto border-l border-[#EAECEF]"
        style={{ animation: 'slideIn 0.22s ease' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base font-bold text-[#0A0B0D]">{d.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F7F8FA] rounded-lg text-[#8A919E] hover:text-[#5B616E] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1.5">Định nghĩa</div>
            <p className="text-sm text-[#5B616E] leading-relaxed">{d.def}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1.5">Hồ sơ rủi ro</div>
            <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs font-medium ${d.riskCls}`}>
              <Shield size={13} className="mt-0.5 flex-shrink-0" /> {d.risk}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1.5">Nền tảng phổ biến</div>
            <div className="flex flex-wrap gap-1.5">
              {d.platforms.map(p => (
                <span key={p} className="px-2.5 py-1 bg-[#F7F8FA] border border-[#EAECEF] rounded-lg text-xs font-medium text-[#5B616E]">{p}</span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1.5">
              <Info size={12} /> Góc nhìn thị trường
            </div>
            <p className="text-xs text-amber-600 leading-relaxed">{d.tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export default function App() {
  const { stocks, marketIndices, lastUpdated, isLive } = useMarketData();
  const portfolio = usePortfolio();
  const [tab, setTab] = useState('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const nav = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Wealth Dashboard' },
    { id: 'screener',  icon: BarChart3,       label: 'Bảng giá Stocks' },
    { id: 'compound',  icon: Calculator,      label: 'Lãi kép' },
  ];
  const assets = [
    { id: 'stocks', label: 'Cổ phiếu VN' },
    { id: 'gold',   label: 'Vàng (SJC/DOJI)' },
    { id: 'crypto', label: 'Crypto & Stablecoins' },
    { id: 'bonds',  label: 'Trái phiếu DN' },
    { id: 'funds',  label: 'Quỹ mở đầu tư' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EAECEF]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0052FF] flex items-center justify-center">
              <PieChart size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-[#0A0B0D] tracking-tight">
              Wealth<span className="text-[#8A919E] font-normal">tech</span>Hub
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FA] border border-[#EAECEF] rounded-lg">
              <span className="text-[#8A919E] font-semibold">VN-INDEX</span>
              <span className="font-bold text-[#05B169] flex items-center gap-1 tabular-nums">
                {marketIndices.vnIndex.toFixed(2)} <TrendingUp size={10} />
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FA] border border-[#EAECEF] rounded-lg">
              <span className="text-[#8A919E] font-semibold">USDT/VND</span>
              <span className="font-bold text-[#0A0B0D] tabular-nums">{marketIndices.usdtVnd.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F8FA] border border-[#EAECEF] rounded-lg text-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#05B169]' : 'bg-amber-400'} animate-pulse`} />
            <span className="text-[#8A919E] font-medium hidden sm:block">
              {isLive ? 'Live' : 'Offline'} · {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-3">
          <nav className="bg-white border border-[#EAECEF] rounded-xl shadow-sm overflow-hidden">
            {nav.map((item, i) => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${i < nav.length - 1 ? 'border-b border-[#EAECEF]' : ''} ${
                  tab === item.id
                    ? 'bg-[#EBF0FF] text-[#0052FF]'
                    : 'text-[#5B616E] hover:bg-[#F7F8FA] hover:text-[#0A0B0D]'
                }`}>
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="bg-white border border-[#EAECEF] rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EAECEF] flex items-center gap-2">
              <BookOpen size={12} className="text-[#8A919E]" />
              <span className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest">Thư viện tài sản</span>
            </div>
            {assets.map((a, i) => (
              <button key={a.id} onClick={() => setSelectedAsset(a.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[#5B616E] hover:bg-[#F7F8FA] hover:text-[#0A0B0D] transition-colors group ${i < assets.length - 1 ? 'border-b border-[#EAECEF]' : ''}`}>
                <span>{a.label}</span>
                <ChevronRight size={12} className="text-[#EAECEF] group-hover:text-[#8A919E] transition-colors" />
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#EAECEF] rounded-xl shadow-sm p-4">
            <div className="text-[11px] font-semibold text-[#8A919E] uppercase tracking-widest mb-1">Danh mục hiện tại</div>
            <div className="text-2xl font-bold text-[#0052FF] tabular-nums mb-1">{portfolio.expectedReturn.toFixed(1)}%</div>
            <div className="text-xs text-[#8A919E] mb-3">kỳ vọng / năm</div>
            <AllocationBar targets={portfolio.targets} />
          </div>
        </aside>

        {/* Main */}
        <main className="lg:col-span-3">
          {tab === 'dashboard' && <UnifiedWealthDashboard portfolio={portfolio} />}
          {tab === 'screener'  && <StockScreener stocks={stocks} />}
          {tab === 'compound'  && <CompoundCalculator />}
        </main>
      </div>

      <AssetExplorer selectedAsset={selectedAsset} onClose={() => setSelectedAsset(null)} />

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        input[type=range]::-webkit-slider-thumb { border-color: white; }
      `}</style>
    </div>
  );
}
