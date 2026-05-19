import React, { useState, useEffect, useMemo } from 'react';
import {
  Info, BarChart3, Calculator, BookOpen,
  TrendingUp, Shield, ArrowRight, X, LayoutDashboard, Sparkles, PieChart
} from 'lucide-react';

// --- TYPES ---
interface Stock {
  ticker: string;
  name: string;
  price: number;
  pe: number;
  divYield: number;
  revenueGrowth: number;
  stabilityScore: number;
  category: string;
}

interface Portfolio {
  targets: Record<string, number>;
  setTargets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  handleTargetChange: (changedAsset: string, valStr: string) => void;
  expectedReturn: number;
}

// --- UTILITIES ---
const formatVND = (amount: number) => {
  if (isNaN(amount) || !isFinite(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount);
};

const formatPct = (decimal: number) => {
  if (isNaN(decimal)) return '0.00%';
  return (decimal * 100).toFixed(2) + '%';
};

// --- CONSTANTS ---
const ASSET_RETURNS: Record<string, number> = {
  vnStocks: 12, gold: 8, crypto: 15, bonds: 8, funds: 10, cash: 5
};

const ASSET_COLORS: Record<string, string> = {
  vnStocks: '#f59e0b',
  gold:     '#fbbf24',
  crypto:   '#a78bfa',
  bonds:    '#38bdf8',
  funds:    '#34d399',
  cash:     '#22d3ee',
};

const ASSET_LABELS: Record<string, string> = {
  vnStocks: 'VN Stocks',
  gold:     'Gold (SJC)',
  crypto:   'Crypto',
  bonds:    'Trái phiếu',
  funds:    'Quỹ mở',
  cash:     'Money Market',
};

const PRESET_PROFILES = [
  { label: 'Conservative', t: { vnStocks: 10, gold: 20, crypto: 0, bonds: 30, funds: 10, cash: 30 } },
  { label: 'Moderate',     t: { vnStocks: 30, gold: 15, crypto: 5, bonds: 20, funds: 15, cash: 15 } },
  { label: 'Aggressive',   t: { vnStocks: 50, gold: 5,  crypto: 15, bonds: 5,  funds: 15, cash: 10 } },
  { label: 'All-Weather',  t: { vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20 } },
];

// --- HOOKS ---
const useMarketData = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState({
    vnIndex: 1250.45, vn30: 1265.10, goldSJC: 82500000, usdtVnd: 25450,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(false);

  const targetTickers = ['FPT', 'VCB', 'VNM', 'HPG', 'TCB', 'MWG'];

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const stockRes = await fetch(`https://services.entrade.com.vn/chart-api/v2/quotes?symbols=${targetTickers.join(',')}`);
        const stockData = await stockRes.json();
        const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin&vs_currencies=vnd');
        const cryptoData = await cryptoRes.json();

        if (stockData?.data) {
          const nameMap: Record<string, string> = {
            FPT: 'FPT Corp', VCB: 'Vietcombank', VNM: 'Vinamilk',
            HPG: 'Hoa Phat', TCB: 'Techcombank', MWG: 'Mobile World',
          };
          setStocks(targetTickers.map(ticker => {
            const d = stockData.data.find((item: any) => item.symbol === ticker);
            return {
              ticker, name: nameMap[ticker] || ticker,
              price: d?.lastPrice ?? 0, pe: d ? 15.5 : 0,
              divYield: 0.03, revenueGrowth: 0.15, stabilityScore: 8, category: 'Market Data',
            };
          }));
        }

        setMarketIndices(prev => ({
          ...prev,
          usdtVnd: cryptoData.tether?.vnd || 25450,
          vnIndex: prev.vnIndex + (Math.random() - 0.5) * 2,
        }));
        setIsLive(true);
        setLastUpdated(new Date());
      } catch {
        setIsLive(false);
      }
    };

    fetchMarketData();
    const id = setInterval(fetchMarketData, 10000);
    return () => clearInterval(id);
  }, []);

  return { stocks, marketIndices, lastUpdated, isLive };
};

const usePortfolio = () => {
  const [targets, setTargets] = useState<Record<string, number>>({
    vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20,
  });

  const handleTargetChange = (changedAsset: string, valStr: string) => {
    let newValue = parseFloat(valStr);
    if (isNaN(newValue)) newValue = 0;
    newValue = Math.max(0, Math.min(100, newValue));

    setTargets(prev => {
      const diff = newValue - (prev[changedAsset] || 0);
      const newTargets = { ...prev, [changedAsset]: newValue };
      const others = Object.keys(prev).filter(a => a !== changedAsset);
      const otherTotal = others.reduce((s, a) => s + prev[a], 0);

      if (otherTotal === 0) {
        const split = (100 - newValue) / (others.length || 1);
        others.forEach(a => (newTargets[a] = split));
      } else if (diff !== 0) {
        others.forEach(a => {
          newTargets[a] = Math.max(0, prev[a] - (diff * (prev[a] / otherTotal)));
        });
      }

      let sum = Object.values(newTargets).reduce((a: number, b) => a + (isNaN(Number(b)) ? 0 : Number(b)), 0);
      if (Math.abs(sum - 100) > 0.01 && others.length > 0) newTargets[others[0]] += 100 - sum;

      Object.keys(newTargets).forEach(k => {
        newTargets[k] = Math.round(isNaN(newTargets[k]) ? 0 : newTargets[k] * 10) / 10;
      });
      return newTargets;
    });
  };

  const expectedReturn = Object.keys(targets).reduce(
    (sum, asset) => sum + (targets[asset] / 100) * ASSET_RETURNS[asset], 0
  );

  return { targets, setTargets, handleTargetChange, expectedReturn };
};

// --- UI PRIMITIVES ---
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl ${className}`}>
    {children}
  </div>
);

const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => (
  <div className="relative group flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-xl shadow-2xl z-50 pointer-events-none leading-relaxed">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
    </div>
  </div>
);

const NumberInput = ({ value, onChange, className, placeholder = '0' }: {
  value: string | number; onChange: (val: number | string) => void;
  className?: string; placeholder?: string;
}) => {
  const display = (value === '' || value === null || isNaN(Number(value))) ? '' : Number(value).toLocaleString('en-US');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    onChange(raw === '' ? '' : isNaN(Number(raw)) ? value : Number(raw));
  };
  return (
    <input
      type="text" inputMode="numeric" value={display}
      onChange={handleChange} className={className} placeholder={placeholder}
    />
  );
};

// --- DONUT CHART ---
const DonutChart = ({ targets, expectedReturn }: { targets: Record<string, number>; expectedReturn: number }) => {
  const total = Object.values(targets).reduce((a, b) => a + b, 0) || 1;
  const r = 50;
  const circ = 2 * Math.PI * r;
  const GAP = circ * 0.014;

  let cum = 0;
  const segs = Object.entries(targets)
    .filter(([, v]) => v > 0.5)
    .map(([key, value]) => {
      const pct = value / total;
      const segLen = Math.max(0, pct * circ - GAP);
      const rot = cum * 360 - 90;
      cum += pct;
      return { key, segLen, rot, color: ASSET_COLORS[key] || '#52525b' };
    });

  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#27272a" strokeWidth="20" />
      {segs.map(s => (
        <circle
          key={s.key}
          cx="70" cy="70" r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="20"
          strokeDasharray={`${s.segLen} ${circ - s.segLen}`}
          transform={`rotate(${s.rot} 70 70)`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)' }}
        />
      ))}
      <text x="70" y="64" textAnchor="middle" fill="#f4f4f5" fontSize="22" fontWeight="700" fontFamily="Inter, system-ui">
        {expectedReturn.toFixed(1)}%
      </text>
      <text x="70" y="80" textAnchor="middle" fill="#52525b" fontSize="9" letterSpacing="1.5" fontFamily="Inter, system-ui">
        EXP. RETURN
      </text>
    </svg>
  );
};

// --- WEALTH DASHBOARD ---
const UnifiedWealthDashboard = ({ portfolio }: { portfolio: Portfolio }) => {
  const { targets, handleTargetChange, expectedReturn } = portfolio;

  const [currentCapital, setCurrentCapital] = useState<number | string>(100000000);
  const [targetGoal, setTargetGoal] = useState<number | string>(3000000000);
  const [years, setYears] = useState<number | string>(10);

  const r = expectedReturn / 100 / 12;
  const n = Math.max(Number(years), 0.1) * 12;
  const pv = Number(currentCapital) || 0;
  const fv = Number(targetGoal) || 0;

  let requiredMonthly = 0;
  if (pv < fv) {
    requiredMonthly = r > 0
      ? (fv - pv * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n) - 1) / r)
      : (fv - pv) / n;
  }

  const validMonthly = Math.max(0, requiredMonthly);
  const totalPrincipal = pv + validMonthly * n;
  const totalInterest = Math.max(0, fv - totalPrincipal);
  const principalPct = fv === 0 ? 0 : Math.min(100, (totalPrincipal / fv) * 100);
  const interestPct = Math.max(0, 100 - principalPct);
  const isInfinite = !isFinite(requiredMonthly) || requiredMonthly < 0;

  const allocationBreakdown = Object.keys(targets).map(asset => ({
    asset,
    targetPct: targets[asset],
    capitalAmount: pv * (targets[asset] / 100),
    monthlyAmount: validMonthly * (targets[asset] / 100),
  }));

  const inputCls = "w-full px-4 py-3 text-base font-semibold text-zinc-100 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-zinc-600";

  return (
    <div className="space-y-5">

      {/* Hero action card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950/30 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex-1">
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest flex items-center gap-2 mb-3">
              <Sparkles size={12} className="text-violet-400" /> Kế hoạch hành động
            </p>
            {pv >= fv ? (
              <>
                <div className="text-3xl font-black text-emerald-400 mb-1">Mục tiêu đã đạt!</div>
                <p className="text-zinc-500 text-sm">Số dư hiện tại đã vượt mục tiêu của bạn.</p>
              </>
            ) : isInfinite ? (
              <>
                <div className="text-xl font-bold text-zinc-300 mb-1">Chưa khả thi</div>
                <p className="text-zinc-500 text-sm">Điều chỉnh thời gian, mục tiêu hoặc mức rủi ro.</p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-white">
                    {formatVND(validMonthly)}
                  </span>
                  <span className="text-lg text-zinc-500 font-medium">/ tháng</span>
                </div>
                <p className="text-zinc-400 text-sm max-w-sm">
                  Để đạt <strong className="text-zinc-200">{formatVND(fv)}</strong> trong{' '}
                  <strong className="text-zinc-200">{years} năm</strong> với tỷ suất{' '}
                  <strong className="text-violet-400">{expectedReturn.toFixed(1)}%/năm</strong>.
                </p>
              </>
            )}
          </div>

          {!isInfinite && pv < fv && (
            <div className="w-full md:w-72 bg-zinc-950/80 border border-zinc-800 rounded-xl p-5">
              <div className="flex justify-between items-end mb-3">
                <span className="text-zinc-400 text-xs font-medium">Hiệu ứng lãi kép</span>
                <span className="text-emerald-400 text-xs font-semibold">+{interestPct.toFixed(1)}% lợi nhuận</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${principalPct}%` }} className="bg-zinc-500 transition-all duration-700 rounded-l-full" />
                <div style={{ width: `${interestPct}%` }} className="bg-emerald-500 transition-all duration-700 rounded-r-full" />
              </div>
              <div className="flex justify-between text-xs">
                <div>
                  <div className="text-zinc-500 mb-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> Vốn gốc
                  </div>
                  <div className="font-bold text-zinc-200">{formatVND(totalPrincipal)}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-500 mb-1 flex items-center gap-1.5 justify-end">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Lợi nhuận
                  </div>
                  <div className="font-bold text-emerald-400">+{formatVND(totalInterest)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Inputs */}
        <Card className="p-6">
          <div className="mb-5 pb-4 border-b border-zinc-800">
            <h3 className="font-bold text-zinc-100 text-base">Thông số đầu vào</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Trạng thái hiện tại và mục tiêu tương lai.</p>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label className="font-medium text-zinc-400">Tổng tích lũy hiện có</label>
                <span className="text-zinc-600 font-mono">VND</span>
              </div>
              <NumberInput value={currentCapital} onChange={setCurrentCapital} className={inputCls} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label className="font-medium text-zinc-400">Mục tiêu tài sản</label>
                <span className="text-zinc-600 font-mono">VND</span>
              </div>
              <NumberInput value={targetGoal} onChange={setTargetGoal} className={inputCls} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label className="font-medium text-zinc-400">Thời gian kỳ vọng</label>
                <span className="text-zinc-600 font-mono">{years} Năm</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="1" max="40" step="1" value={Number(years)}
                  onChange={e => setYears(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-zinc-700 rounded-full accent-violet-500 cursor-pointer"
                />
                <input
                  type="number" value={Number(years)} onChange={e => setYears(Number(e.target.value))}
                  className="w-16 px-2 py-2 text-center text-sm font-bold text-zinc-100 bg-zinc-950 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Allocation */}
        <Card className="p-6">
          <div className="flex justify-between items-end mb-5 pb-4 border-b border-zinc-800">
            <div>
              <h3 className="font-bold text-zinc-100 text-base">Chiến lược phân bổ</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Cân bằng rủi ro & kỳ vọng lợi nhuận.</p>
            </div>
          </div>

          {/* Donut chart + legend */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-28 h-28 flex-shrink-0">
              <DonutChart targets={targets} expectedReturn={expectedReturn} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1">
              {Object.keys(targets).map(asset => (
                <div key={asset} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[asset] }} />
                  <span className="text-xs text-zinc-400 truncate">{ASSET_LABELS[asset]}</span>
                  <span className="text-xs font-semibold text-zinc-200 ml-auto flex-shrink-0">{targets[asset].toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preset profiles */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {PRESET_PROFILES.map(rec => (
              <button
                key={rec.label}
                onClick={() => portfolio.setTargets(rec.t)}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-violet-900/40 text-zinc-400 hover:text-violet-300 rounded-lg transition-colors border border-transparent hover:border-violet-800/50"
              >
                {rec.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            {Object.keys(targets).map(asset => (
              <div key={asset} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ASSET_COLORS[asset] }} />
                <span className="text-xs text-zinc-400 w-24 flex-shrink-0 truncate">{ASSET_LABELS[asset]}</span>
                <input
                  type="range" min="0" max="100" step="0.5"
                  value={targets[asset]}
                  onChange={e => handleTargetChange(asset, e.target.value)}
                  className="flex-1 h-1 rounded-full cursor-pointer"
                  style={{ accentColor: ASSET_COLORS[asset] }}
                />
                <span className="text-xs font-bold text-zinc-200 w-10 text-right flex-shrink-0">
                  {targets[asset].toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Disbursement table */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-zinc-800">
          <h3 className="font-bold text-zinc-100 text-base">Kế hoạch giải ngân</h3>
          <Tooltip content="Phân tích toán học cách phân bổ vốn vào từng lớp tài sản dựa trên tỷ lệ mục tiêu.">
            <Info size={14} className="text-zinc-600 cursor-help" />
          </Tooltip>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="pb-3 text-left font-semibold">Lớp tài sản</th>
                <th className="pb-3 text-right font-semibold">Tỷ trọng</th>
                <th className="pb-3 text-right font-semibold">Vốn ban đầu</th>
                <th className="pb-3 text-right font-semibold">Đầu tư / tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {allocationBreakdown.map(row => (
                <tr key={row.asset} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[row.asset] }} />
                      <span className="font-medium text-zinc-300">{ASSET_LABELS[row.asset]}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                      {row.targetPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-sm text-zinc-400">
                    {formatVND(row.capitalAmount)}
                  </td>
                  <td className="py-3.5 text-right font-bold font-mono text-sm text-emerald-400">
                    +{formatVND(row.monthlyAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// --- STOCK SCREENER ---
const StockScreener = ({ stocks }: { stocks: Stock[] }) => {
  const [filter, setFilter] = useState('all');

  const filteredStocks = useMemo(() => {
    switch (filter) {
      case 'value':     return stocks.filter(s => s.pe < 15 && s.divYield > 0.03);
      case 'growth':    return stocks.filter(s => s.revenueGrowth >= 0.15);
      case 'stability': return stocks.filter(s => s.stabilityScore >= 8);
      default:          return stocks;
    }
  }, [stocks, filter]);

  const filterLabels: Record<string, string> = {
    all: 'Tất cả', value: 'Value', growth: 'Tăng trưởng', stability: 'Ổn định',
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap gap-4 justify-between items-start mb-6 pb-5 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Bảng giá VN-Stocks</h2>
          <p className="text-xs text-zinc-500 mt-1">Dữ liệu real-time từ sàn HOSE/HNX qua API DNSE.</p>
        </div>
        <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {['all', 'value', 'growth', 'stability'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f
                  ? 'bg-zinc-700 text-zinc-100 shadow'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-600 text-xs uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 text-left font-semibold pl-1">Mã / Tên</th>
              <th className="pb-3 text-right font-semibold">Giá (VND)</th>
              <th className="pb-3 text-right font-semibold">P/E</th>
              <th className="pb-3 text-right font-semibold">Cổ tức</th>
              <th className="pb-3 text-right font-semibold">Tăng trưởng</th>
              <th className="pb-3 text-center font-semibold">Ổn định</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-600 text-sm">
                  Không có dữ liệu phù hợp bộ lọc
                </td>
              </tr>
            ) : filteredStocks.map(stock => (
              <tr key={stock.ticker} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-4 pl-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-400 text-xs font-bold">{stock.ticker.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-200">{stock.ticker}</div>
                      <div className="text-xs text-zinc-500">{stock.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-right font-mono font-semibold text-zinc-200">
                  {stock.price > 0 ? formatVND(stock.price) : <span className="text-zinc-600 text-xs">Đang tải...</span>}
                </td>
                <td className="py-4 text-right text-zinc-400">{stock.pe > 0 ? stock.pe.toFixed(1) : '—'}</td>
                <td className="py-4 text-right text-zinc-400">{formatPct(stock.divYield)}</td>
                <td className="py-4 text-right">
                  <span className="text-emerald-400 font-medium flex items-center justify-end gap-1">
                    <TrendingUp size={12} />
                    {formatPct(stock.revenueGrowth)}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                    stock.stabilityScore >= 8
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {stock.stabilityScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// --- COMPOUND CALCULATOR ---
const CompoundCalculator = () => {
  const [initial, setInitial] = useState<number | string>(10000000);
  const [monthly, setMonthly] = useState<number | string>(5000000);
  const [rate, setRate] = useState<number | string>(8.5);
  const [years, setYears] = useState<number | string>(10);

  const calculateTotal = () => {
    let total = Number(initial);
    const m = Number(monthly);
    const r = Number(rate) / 100 / 12;
    const y = Number(years) * 12;
    for (let i = 0; i < y; i++) total = (total + m) * (1 + r);
    return total;
  };

  const totalInvested = Number(initial) + Number(monthly) * 12 * Number(years);
  const finalValue = calculateTotal();
  const totalInterest = finalValue - totalInvested;
  const principalPct = finalValue > 0 ? Math.min(100, (totalInvested / finalValue) * 100) : 0;
  const interestPct = 100 - principalPct;
  const multiplier = totalInvested > 0 ? (finalValue / totalInvested) : 1;

  const inputCls = "w-full px-3 py-2.5 text-sm font-semibold text-zinc-100 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all";

  return (
    <Card className="p-6">
      <div className="mb-6 pb-5 border-b border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-100">Compound Interest Engine</h2>
        <p className="text-xs text-zinc-500 mt-1">Tính tăng trưởng dài hạn khi đầu tư định kỳ vào quỹ mở VN.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Vốn ban đầu (VND)</label>
            <NumberInput value={initial} onChange={setInitial} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Góp mỗi tháng (VND)</label>
            <NumberInput value={monthly} onChange={setMonthly} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Lãi suất (%)</label>
              <input
                type="number" step="0.1" value={Number(rate)}
                onChange={e => setRate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Số năm</label>
              <input
                type="number" value={Number(years)}
                onChange={e => setYears(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Result highlight */}
          <div className="flex-1 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-zinc-950 border border-indigo-900/40 p-5">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Giá trị tương lai</div>
            <div className="text-3xl font-black text-zinc-100 mb-1">{formatVND(finalValue)}</div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
              <TrendingUp size={11} />
              ×{multiplier.toFixed(1)} so với vốn nạp
            </div>

            <div className="mt-4 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-500">Vốn gốc</span>
                  <span className="text-zinc-300 font-semibold">{formatVND(totalInvested)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 rounded-full transition-all duration-700"
                    style={{ width: `${principalPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-500">Lãi nhận được</span>
                  <span className="text-emerald-400 font-semibold">+{formatVND(totalInterest)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${interestPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- ASSET EXPLORER PANEL ---
const AssetExplorer = ({ selectedAsset, onClose }: { selectedAsset: string | null; onClose: () => void }) => {
  if (!selectedAsset) return null;

  const content: Record<string, { title: string; def: string; risk: string; riskLevel: string; platforms: string[]; tip: string }> = {
    stocks: {
      title: 'Cổ phiếu Việt Nam',
      def: 'Sở hữu một phần doanh nghiệp niêm yết trên HOSE, HNX thông qua sàn giao dịch.',
      risk: 'Cao — Biến động theo thị trường và chu kỳ kinh tế.',
      riskLevel: 'high',
      platforms: ['DNSE', 'TCBS', 'SSI', 'VNDirect'],
      tip: 'Chỉ số VN-Index bị ảnh hưởng lớn bởi nhóm Ngân hàng và Bất động sản.',
    },
    gold: {
      title: 'Vàng vật chất & Online',
      def: 'Tài sản trú ẩn an toàn, được ưa chuộng tại VN để chống lạm phát.',
      risk: 'Trung bình — Rủi ro lưu trữ vật chất; phụ thuộc giá thế giới.',
      riskLevel: 'medium',
      platforms: ['DOJI', 'SJC', 'PNJ eGold'],
      tip: 'Vàng SJC thường có độ chênh lệch cao so với giá vàng thế giới.',
    },
    crypto: {
      title: 'Tài sản số (Crypto)',
      def: 'Các loại tiền mã hóa và token công nghệ blockchain.',
      risk: 'Rất cao — Biến động cực lớn và rủi ro quy định pháp lý.',
      riskLevel: 'very-high',
      platforms: ['Binance', 'OKX', 'Remitano'],
      tip: 'Việt Nam có tỷ lệ chấp nhận crypto cao nhất thế giới.',
    },
    bonds: {
      title: 'Trái phiếu doanh nghiệp',
      def: 'Công cụ nợ được phát hành bởi DN hoặc Chính phủ để huy động vốn.',
      risk: 'Trung bình — Phụ thuộc vào khả năng thanh toán của tổ chức phát hành.',
      riskLevel: 'medium',
      platforms: ['iBond (TCBS)', 'D-Bond (VNDirect)'],
      tip: 'Trái phiếu doanh nghiệp có lợi suất cao hơn nhưng đi kèm rủi ro nợ xấu.',
    },
    funds: {
      title: 'Quỹ Mở (Mutual Funds)',
      def: 'Danh mục đầu tư được quản lý bởi các chuyên gia tài chính.',
      risk: 'Thấp đến Trung bình — Tùy thuộc vào loại quỹ.',
      riskLevel: 'low',
      platforms: ['Dragon Capital', 'VinaCapital', 'Fmarket'],
      tip: 'Phù hợp cho chiến lược DCA (Đầu tư định kỳ) tự động.',
    },
  };

  const data = content[selectedAsset];
  const riskColors: Record<string, string> = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'very-high': 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900 border-l border-zinc-800 h-full shadow-2xl p-6 overflow-y-auto"
        style={{ animation: 'slideIn 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-zinc-100">{data.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">Định nghĩa</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">{data.def}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">Hồ sơ rủi ro</h3>
            <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${riskColors[data.riskLevel]}`}>
              <Shield size={14} className="mt-0.5 flex-shrink-0" />
              <span>{data.risk}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-2">Nền tảng phổ biến</h3>
            <div className="flex flex-wrap gap-2">
              {data.platforms.map(p => (
                <span key={p} className="px-3 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <h4 className="font-semibold text-amber-400 flex items-center gap-2 mb-2 text-sm">
              <Info size={14} /> Góc nhìn thị trường
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">{data.tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP SHELL ---
export default function App() {
  const { stocks, marketIndices, lastUpdated, isLive } = useMarketData();
  const portfolio = usePortfolio();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Wealth Dashboard' },
    { id: 'screener',  icon: BarChart3,       label: 'Bảng giá Stocks' },
    { id: 'compound',  icon: Calculator,      label: 'Lãi kép' },
  ];

  const assetLibrary = [
    { id: 'stocks', label: 'Cổ phiếu VN' },
    { id: 'gold',   label: 'Vàng (SJC/DOJI)' },
    { id: 'crypto', label: 'Crypto & Stablecoins' },
    { id: 'bonds',  label: 'Trái phiếu DN' },
    { id: 'funds',  label: 'Quỹ mở đầu tư' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <PieChart size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">
              Wealth<span className="text-zinc-500 font-normal">tech</span>Hub
            </span>
          </div>

          {/* Market tickers */}
          <div className="hidden md:flex items-center gap-5 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-zinc-600 font-semibold">VN-INDEX</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                {marketIndices.vnIndex.toFixed(2)}
                <TrendingUp size={11} />
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="text-zinc-600 font-semibold">USDT/VND</span>
              <span className="font-bold text-zinc-300">{marketIndices.usdtVnd.toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Live status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span className="text-zinc-400 font-mono hidden sm:block">
              {isLive ? 'Live' : 'Offline'} {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <item.icon size={16} className={activeTab === item.id ? 'text-violet-400' : ''} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Asset library */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
              <BookOpen size={12} /> Thư viện tài sản
            </h3>
            <div className="space-y-1">
              {assetLibrary.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 rounded-lg transition-colors border border-transparent hover:border-zinc-700 group"
                >
                  <span>{asset.label}</span>
                  <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Expected return chip */}
          <div className="bg-gradient-to-br from-violet-950/50 to-zinc-900 border border-violet-900/30 rounded-2xl p-4">
            <div className="text-xs text-zinc-500 mb-1 font-medium">Tỷ suất danh mục</div>
            <div className="text-2xl font-black text-violet-300">{portfolio.expectedReturn.toFixed(1)}%</div>
            <div className="text-xs text-zinc-600 mt-0.5">kỳ vọng / năm</div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && <UnifiedWealthDashboard portfolio={portfolio} />}
          {activeTab === 'screener'  && <StockScreener stocks={stocks} />}
          {activeTab === 'compound'  && <CompoundCalculator />}
        </div>

      </main>

      <AssetExplorer selectedAsset={selectedAsset} onClose={() => setSelectedAsset(null)} />

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
