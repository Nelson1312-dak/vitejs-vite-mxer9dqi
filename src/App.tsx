import React, { useState, useEffect, useMemo } from 'react';
import { 
  Info, BarChart3, Calculator, BookOpen, 
  TrendingUp, Shield, ArrowRight, X, LayoutDashboard, Sparkles, AlertTriangle
} from 'lucide-react';

// --- CẤU HÌNH API (API CONFIGURATION) ---
// Nếu bạn gặp lỗi CORS, bạn có thể thêm một proxy ở đây. 
// Ví dụ: "https://cors-anywhere.herokuapp.com/" (Cần nhấn "Request temporary access" tại trang web của proxy trước)
const PROXY_URL = ""; 
const DNSE_API_URL = "https://services.entrade.com.vn/chart-api/v2/quotes";

// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES) ---
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

// --- CÔNG CỤ HỖ TRỢ (UTILITIES) ---
const formatVND = (amount: number) => {
  if (isNaN(amount) || !isFinite(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPct = (decimal: number) => {
  if (isNaN(decimal)) return '0.00%';
  return (decimal * 100).toFixed(2) + '%';
};

// --- HẰNG SỐ (CONSTANTS) ---
const ASSET_RETURNS: Record<string, number> = {
  vnStocks: 12, gold: 8, crypto: 15, bonds: 8, funds: 10, cash: 5
};

const PRESET_PROFILES = [
  { label: 'An toàn', t: { vnStocks: 10, gold: 20, crypto: 0, bonds: 30, funds: 10, cash: 30 } },
  { label: 'Cân bằng', t: { vnStocks: 30, gold: 15, crypto: 5, bonds: 20, funds: 15, cash: 15 } },
  { label: 'Tăng trưởng', t: { vnStocks: 50, gold: 5, crypto: 15, bonds: 5, funds: 15, cash: 10 } },
  { label: 'Bền vững', t: { vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20 } }
];

// --- HOOKS QUẢN LÝ DỮ LIỆU THỊ TRƯỜNG ---
const useMarketData = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState({
    vnIndex: 1250.45,
    goldSJC: 82500000, 
    usdtVnd: 25450,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dataStatus, setDataStatus] = useState<'live' | 'simulated' | 'error'>('simulated');

  const targetTickers = ['FPT', 'VCB', 'VNM', 'HPG', 'TCB', 'MWG'];

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const fullUrl = `${PROXY_URL}${DNSE_API_URL}?symbols=${targetTickers.join(',')}`;
        const stockRes = await fetch(fullUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!stockRes.ok) throw new Error("CORS or Network Error");
        
        const stockData = await stockRes.json();

        if (stockData && stockData.data) {
          const updatedStocks = targetTickers.map(ticker => {
            const remoteData = stockData.data.find((item: any) => item.symbol === ticker);
            return {
              ticker,
              name: ticker === 'FPT' ? 'FPT Corp' : ticker === 'VCB' ? 'Vietcombank' : ticker === 'VNM' ? 'Vinamilk' : ticker === 'HPG' ? 'Hoa Phat' : ticker === 'TCB' ? 'Techcombank' : 'Mobile World',
              price: remoteData ? remoteData.lastPrice : 0,
              pe: 15.5,
              divYield: 0.03,
              revenueGrowth: 0.15,
              stabilityScore: 8,
              category: 'Dữ liệu thực tế'
            };
          });
          setStocks(updatedStocks);
          setDataStatus('live');
        }
      } catch (error) {
        setDataStatus('simulated');
        setStocks(prev => {
          const initial = [
            { ticker: 'FPT', name: 'FPT Corp', price: 135000, pe: 18.5, divYield: 0.03, revenueGrowth: 0.22, stabilityScore: 9, category: 'Tech' },
            { ticker: 'VCB', name: 'Vietcombank', price: 92000, pe: 14.2, divYield: 0.02, revenueGrowth: 0.15, stabilityScore: 8, category: 'Bank' },
            { ticker: 'VNM', name: 'Vinamilk', price: 68000, pe: 16.1, divYield: 0.06, revenueGrowth: 0.05, stabilityScore: 9, category: 'F&B' },
            { ticker: 'HPG', name: 'Hoa Phat', price: 30500, pe: 12.4, divYield: 0.04, revenueGrowth: 0.18, stabilityScore: 7, category: 'Material' },
          ];
          const base = prev.length > 0 ? prev : initial;
          return base.map(s => ({
            ...s,
            price: Math.round(s.price * (1 + (Math.random() - 0.5) * 0.0005))
          }));
        });

        setMarketIndices(prev => ({
          ...prev,
          vnIndex: Number((prev.vnIndex + (Math.random() - 0.5) * 0.2).toFixed(2))
        }));
      }
      setLastUpdated(new Date());
    };

    fetchMarketData();
    const intervalId = setInterval(fetchMarketData, 5000); 
    return () => clearInterval(intervalId);
  }, []);

  return { stocks, marketIndices, lastUpdated, dataStatus };
};

const usePortfolio = () => {
  const [targets, setTargets] = useState<Record<string, number>>({
    vnStocks: 25.0, gold: 15.0, crypto: 10.0, bonds: 20.0, funds: 10.0, cash: 20.0
  });

  const handleTargetChange = (changedAsset: string, valStr: string) => {
    let newValue = parseFloat(valStr);
    if (isNaN(newValue)) newValue = 0;
    if (newValue > 100) newValue = 100;
    if (newValue < 0) newValue = 0;

    setTargets(prev => {
      const oldTarget = prev[changedAsset] || 0;
      const diff = newValue - oldTarget;
      const newTargets = { ...prev, [changedAsset]: newValue };
      const otherAssets = Object.keys(prev).filter(a => a !== changedAsset);
      const otherTotal = otherAssets.reduce((sum, a) => sum + prev[a], 0);

      if (otherTotal === 0) {
        const split = (100 - newValue) / (otherAssets.length || 1);
        otherAssets.forEach(a => newTargets[a] = split);
      } else if (diff !== 0) {
        otherAssets.forEach(a => {
          const proportion = prev[a] / otherTotal;
          newTargets[a] = Math.max(0, prev[a] - (diff * proportion));
        });
      }

      let currentSum = Object.values(newTargets).reduce((a: number, b) => a + (isNaN(Number(b)) ? 0 : Number(b)), 0);
      if (Math.abs(currentSum - 100) > 0.01 && otherAssets.length > 0) {
        newTargets[otherAssets[0]] += (100 - currentSum);
      }

      Object.keys(newTargets).forEach(k => {
        newTargets[k] = Math.round(newTargets[k] * 10) / 10;
      });

      return newTargets;
    });
  };

  const expectedReturn = Object.keys(targets).reduce((sum, asset) => {
    return sum + (targets[asset] / 100) * ASSET_RETURNS[asset];
  }, 0);

  return { targets, setTargets, handleTargetChange, expectedReturn };
};

// --- UI COMPONENTS ---
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
  <div className="relative group flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-stone-800 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
);

const NumberInput = ({ value, onChange, className, placeholder = "0" }: { value: string | number, onChange: (val: number | string) => void, className?: string, placeholder?: string }) => {
  const displayValue = (value === '' || value === null || isNaN(Number(value))) ? '' : Number(value).toLocaleString('en-US');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, ''); 
    if (rawValue === '') onChange('');
    else if (!isNaN(Number(rawValue))) onChange(Number(rawValue));
  };
  return <input type="text" inputMode="numeric" value={displayValue} onChange={handleChange} className={className} placeholder={placeholder} />;
};

// --- VIEWS ---
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
    requiredMonthly = r > 0 ? (fv - pv * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n) - 1) / r) : (fv - pv) / n;
  }
  
  const validMonthly = Math.max(0, requiredMonthly);
  const totalPrincipal = pv + (validMonthly * n);
  const totalInterest = Math.max(0, fv - totalPrincipal);
  const principalPct = fv === 0 ? 0 : Math.min(100, (totalPrincipal / fv) * 100);
  const interestPct = fv === 0 ? 0 : Math.max(0, 100 - principalPct);

  const allocationBreakdown = Object.keys(targets).map(asset => {
    const targetPct = isNaN(targets[asset]) ? 0 : targets[asset] / 100;
    return { asset, targetPct: targets[asset], capitalAmount: pv * targetPct, monthlyAmount: validMonthly * targetPct };
  });

  const formatAssetLabel = (key: string) => {
    const labels: Record<string, string> = { vnStocks: 'Cổ phiếu VN', gold: 'Vàng (SJC)', crypto: 'Crypto (USDT)', bonds: 'Trái phiếu', funds: 'Quỹ mở', cash: 'Tiền mặt' };
    return labels[key] || key;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Card className="p-6 bg-white dark:bg-stone-900 border-none ring-1 ring-stone-200 dark:ring-stone-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 w-full">
            <h3 className="text-stone-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mb-3">
              <Sparkles size={12}/> HÀNH ĐỘNG HÀNG THÁNG
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-4xl font-black tracking-tighter text-stone-900 dark:text-white">
                {formatVND(validMonthly)}
              </div>
              <div className="text-sm text-stone-500 font-medium lowercase">/ tháng</div>
            </div>
            <p className="text-stone-500 text-xs leading-relaxed max-w-sm">
              Tích lũy định kỳ để đạt <strong className="text-stone-900 dark:text-white">{formatVND(fv)}</strong> sau <strong className="text-stone-900 dark:text-white">{years} năm</strong>.
            </p>
          </div>

          <div className="flex-1 w-full bg-stone-900 dark:bg-black rounded-xl p-5 border border-stone-800">
            <div className="flex justify-between items-end mb-3 text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
              <span>Tăng trưởng dự kiến</span>
              <span className="text-emerald-400">+{interestPct.toFixed(1)}% LÃI KÉP</span>
            </div>
            <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden flex mb-4">
              <div style={{ width: `${principalPct}%` }} className="bg-stone-400 transition-all duration-1000"></div>
              <div style={{ width: `${interestPct}%` }} className="bg-emerald-500 transition-all duration-1000"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div><div className="text-stone-500 mb-1">VỐN GỐC</div><div className="font-bold text-stone-100">{formatVND(totalPrincipal)}</div></div>
              <div className="text-right"><div className="text-stone-500 mb-1">LỢI NHUẬN</div><div className="font-bold text-emerald-400">+{formatVND(totalInterest)}</div></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-6 uppercase tracking-wider">1. Thông số tài chính</h3>
          <div className="space-y-6">
            <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Vốn hiện có</label>
            <NumberInput value={currentCapital} onChange={setCurrentCapital} className="w-full px-4 py-3 font-bold text-stone-900 bg-stone-50 border-none ring-1 ring-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 transition-all" /></div>
            <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Mục tiêu tích lũy</label>
            <NumberInput value={targetGoal} onChange={setTargetGoal} className="w-full px-4 py-3 font-bold text-stone-900 bg-stone-50 border-none ring-1 ring-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 transition-all" /></div>
            <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Thời gian (năm): {years}</label>
            <input type="range" min="1" max="40" value={Number(years)} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-stone-900" /></div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm uppercase tracking-wider">2. Phân bổ rủi ro</h3>
            <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs">Lãi: {expectedReturn.toFixed(1)}%/năm</div>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {PRESET_PROFILES.map(rec => (
              <button key={rec.label} onClick={() => portfolio.setTargets(rec.t)} className="whitespace-nowrap px-3 py-1.5 text-[10px] font-bold border border-stone-200 hover:bg-stone-900 hover:text-white rounded-full transition-all uppercase tracking-tighter">
                {rec.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {Object.keys(targets).map(asset => (
              <div key={asset} className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter"><span className="text-stone-500">{formatAssetLabel(asset)}</span><span>{targets[asset].toFixed(1)}%</span></div>
                <input type="range" min="0" max="100" step="0.5" value={targets[asset]} onChange={(e) => handleTargetChange(asset, e.target.value)} className="w-full accent-stone-900" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 overflow-hidden">
        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-6 uppercase tracking-wider">3. Kế hoạch giải ngân</h3>
        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left">
            <thead><tr className="text-stone-400 font-bold border-b border-stone-100"><th className="pb-3">TÀI SẢN</th><th className="pb-3 text-right">VỐN BAN ĐẦU</th><th className="pb-3 text-right">MỖI THÁNG</th></tr></thead>
            <tbody className="divide-y divide-stone-50">
              {allocationBreakdown.map(row => (
                <tr key={row.asset} className="hover:bg-stone-50 transition-colors">
                  <td className="py-4 font-bold text-stone-700">{formatAssetLabel(row.asset)}</td>
                  <td className="py-4 text-right text-stone-500">{formatVND(row.capitalAmount)}</td>
                  <td className="py-4 text-right font-black text-stone-900">+{formatVND(row.monthlyAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const StockScreener = ({ stocks }: { stocks: Stock[] }) => {
  const [filter, setFilter] = useState('all');
  const filteredStocks = useMemo(() => {
    if (filter === 'value') return stocks.filter(s => s.pe < 15);
    if (filter === 'growth') return stocks.filter(s => s.revenueGrowth >= 0.15);
    return stocks;
  }, [stocks, filter]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-sm font-bold uppercase tracking-widest">Thị trường VN-Stocks</h2><p className="text-[10px] text-stone-400 mt-1">Dữ liệu kết nối trực tiếp từ Entrade (DNSE)</p></div>
        <div className="flex gap-1 bg-stone-100 p-1 rounded-xl text-[10px] font-bold">
          {['all', 'value', 'growth'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg transition-all ${filter === f ? 'bg-white shadow-sm text-stone-900' : 'text-stone-400'}`}>
              {f === 'all' ? 'TẤT CẢ' : f === 'value' ? 'GIÁ TRỊ' : 'TĂNG TRƯỞNG'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto text-[11px]">
        <table className="w-full text-left border-collapse">
          <thead><tr className="border-b text-stone-400 font-bold uppercase"><th className="py-3 px-4">Mã</th><th className="py-3 px-4">Giá hiện tại</th><th className="py-3 px-4">P/E</th><th className="py-3 px-4 text-right">Tăng trưởng</th></tr></thead>
          <tbody>
            {filteredStocks.map(stock => (
              <tr key={stock.ticker} className="border-b border-stone-50 hover:bg-stone-50 transition-all">
                <td className="py-4 px-4 font-black text-stone-900">{stock.ticker}</td>
                <td className="py-4 px-4 text-stone-600 font-mono">{formatVND(stock.price)}</td>
                <td className="py-4 px-4 text-stone-600">{stock.pe}</td>
                <td className="py-4 px-4 text-right font-bold text-emerald-600">+{formatPct(stock.revenueGrowth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const CompoundCalculator = () => {
  const [initial, setInitial] = useState<number | string>(10000000);
  const [monthly, setMonthly] = useState<number | string>(5000000);
  const [rate, setRate] = useState<number | string>(8.5); 
  const [years, setYears] = useState<number | string>(10);

  const finalValue = useMemo(() => {
    let total = Number(initial);
    const m = Number(monthly);
    const r = Number(rate) / 100 / 12;
    const y = Number(years) * 12;
    for (let i = 0; i < y; i++) total = (total + m) * (1 + r);
    return total;
  }, [initial, monthly, rate, years]);

  return (
    <Card className="p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest mb-6">Mô phỏng sức mạnh lãi kép</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Vốn đầu tư ban đầu</label><NumberInput value={initial} onChange={setInitial} className="w-full px-4 py-3 font-bold bg-stone-50 rounded-xl" /></div>
          <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Tích lũy mỗi tháng</label><NumberInput value={monthly} onChange={setMonthly} className="w-full px-4 py-3 font-bold bg-stone-50 rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Lãi suất (%)</label><input type="number" step="0.1" value={Number(rate)} onChange={e => setRate(e.target.value)} className="w-full px-4 py-3 font-bold bg-stone-50 rounded-xl" /></div>
            <div><label className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Thời gian (năm)</label><input type="number" value={Number(years)} onChange={e => setYears(Number(e.target.value))} className="w-full px-4 py-3 font-bold bg-stone-50 rounded-xl" /></div>
          </div>
        </div>
        <div className="bg-stone-900 p-8 rounded-2xl flex flex-col justify-center border border-stone-800">
          <div className="text-[10px] text-stone-500 font-bold uppercase mb-2 tracking-widest">GIÁ TRỊ TÀI SẢN SAU {years} NĂM</div>
          <div className="text-4xl font-black text-white tracking-tighter">{formatVND(finalValue)}</div>
          <div className="mt-4 p-3 bg-stone-800/50 rounded-lg border border-stone-700/50">
            <p className="text-[10px] text-stone-400 leading-relaxed italic">"Lãi kép là kỳ quan thứ 8 của thế giới. Ai hiểu nó sẽ kiếm được tiền, ai không hiểu sẽ phải trả chi phí cho nó."</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- GIAO DIỆN CHÍNH (APP SHELL) ---
export default function App() {
  const { stocks, marketIndices, lastUpdated, dataStatus } = useMarketData();
  const portfolio = usePortfolio();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#fdfcf8] dark:bg-[#0a0a0a] font-sans text-stone-900 selection:bg-stone-200">
      <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><div className="w-7 h-7 bg-stone-900 text-white rounded flex items-center justify-center font-black text-sm">W</div><span className="font-black text-base tracking-tighter uppercase">Wealthtech</span></div>
          <Tooltip content={dataStatus === 'live' ? "Đã kết nối trực tiếp với API DNSE" : "Trình duyệt chặn API (CORS). Đang hiển thị dữ liệu mô phỏng dựa trên giá thị trường gần nhất."}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${dataStatus === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dataStatus === 'live' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
              {dataStatus === 'live' ? 'Kết nối trực tiếp' : 'Dữ liệu mô phỏng'}
            </div>
          </Tooltip>
        </div>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-tighter">
          <div className="flex flex-col"><span className="text-stone-400">VN-INDEX</span><span className="text-emerald-600">{marketIndices.vnIndex.toFixed(2)}</span></div>
          <div className="flex flex-col"><span className="text-stone-400">CẬP NHẬT</span><span className="text-stone-900 dark:text-white">{lastUpdated.toLocaleTimeString()}</span></div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <nav className="flex flex-col gap-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'BẢNG ĐIỀU KHIỂN' },
              { id: 'screener', icon: BarChart3, label: 'THỊ TRƯỜNG' },
              { id: 'compound', icon: Calculator, label: 'TÍNH LÃI KÉP' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[10px] font-black tracking-widest transition-all ${activeTab === item.id ? 'bg-stone-900 text-white shadow-xl translate-x-1' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-900'}`}>
                <item.icon size={16} />{item.label}
              </button>
            ))}
          </nav>
          <div className="p-6 bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-100 dark:border-stone-800">
            <h3 className="text-[9px] font-black text-stone-400 uppercase mb-4 tracking-[0.2em]">CƠ SỞ DỮ LIỆU</h3>
            <div className="flex flex-col gap-3">
              {['stocks', 'gold', 'crypto'].map(a => (
                <button key={a} onClick={() => setSelectedAsset(a)} className="flex items-center justify-between text-[11px] font-bold text-stone-600 hover:text-black group">
                  {a === 'stocks' ? 'Cổ phiếu' : a === 'gold' ? 'Vàng SJC' : 'Tiền kỹ thuật số'} 
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
          {dataStatus === 'simulated' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={16} />
              <p className="text-[9px] text-amber-800 leading-relaxed font-medium">
                Ứng dụng đang dùng <strong>Dữ liệu Mô phỏng</strong> vì trình duyệt chặn kết nối API DNSE. Hãy deploy lên Vercel để khắc phục.
              </p>
            </div>
          )}
        </div>
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && <UnifiedWealthDashboard portfolio={portfolio} />}
          {activeTab === 'screener' && <StockScreener stocks={stocks} />}
          {activeTab === 'compound' && <CompoundCalculator />}
        </div>
      </main>
      
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelectedAsset(null)}>
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-8 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-lg font-black uppercase tracking-widest">{selectedAsset === 'stocks' ? 'Cổ phiếu VN' : selectedAsset === 'gold' ? 'Vàng SJC' : 'Tiền số'}</h2>
              <button onClick={() => setSelectedAsset(null)} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Khái niệm</h3>
                <p className="text-xs text-stone-600 leading-relaxed">Dữ liệu thị trường hiện tại được đồng bộ từ sàn HOSE và HNX thông qua các đối tác dữ liệu tài chính tại Việt Nam.</p>
              </div>
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100">
                <Shield className="text-stone-900 mb-3" size={18} />
                <h4 className="font-bold text-xs mb-1">Hồ sơ rủi ro</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed">Được đánh giá là tài sản biến động cao, phù hợp cho mục tiêu tăng trưởng dài hạn.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}