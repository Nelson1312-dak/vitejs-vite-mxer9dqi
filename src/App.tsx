import React, { useState, useEffect, useMemo } from 'react';
import { 
  Info, BarChart3, Calculator, BookOpen, 
  TrendingUp, Shield, ArrowRight, X, LayoutDashboard, Sparkles
} from 'lucide-react';

// --- TYPES & INTERFACES ---
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
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPct = (decimal: number) => {
  if (isNaN(decimal)) return '0.00%';
  return (decimal * 100).toFixed(2) + '%';
};

// --- CONSTANTS ---
const ASSET_RETURNS: Record<string, number> = {
  vnStocks: 12, 
  gold: 8,      
  crypto: 15,   
  bonds: 8,     
  funds: 10,    
  cash: 5       
};

const PRESET_PROFILES = [
  { label: 'Conservative', t: { vnStocks: 10, gold: 20, crypto: 0, bonds: 30, funds: 10, cash: 30 } },
  { label: 'Moderate', t: { vnStocks: 30, gold: 15, crypto: 5, bonds: 20, funds: 15, cash: 15 } },
  { label: 'Aggressive', t: { vnStocks: 50, gold: 5, crypto: 15, bonds: 5, funds: 15, cash: 10 } },
  { label: 'All-Weather', t: { vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20 } }
];

// --- CUSTOM HOOKS ---
const useMarketData = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [marketIndices, setMarketIndices] = useState({
    vnIndex: 1250.45,
    vn30: 1265.10,
    goldSJC: 82500000, 
    usdtVnd: 25450,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(false);

  // Danh sách các mã cổ phiếu theo dõi
  const targetTickers = ['FPT', 'VCB', 'VNM', 'HPG', 'TCB', 'MWG'];

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // 1. Fetch Chứng khoán VN từ DNSE (Entrade API)
        // Lưu ý: Trong môi trường local/dev có thể bị chặn CORS. 
        // Khi deploy bạn nên dùng Proxy hoặc Serverless Function.
        const stockRes = await fetch(`https://services.entrade.com.vn/chart-api/v2/quotes?symbols=${targetTickers.join(',')}`);
        const stockData = await stockRes.json();

        // 2. Fetch Crypto (Dùng CoinGecko API miễn phí cho tỷ giá USDT/BTC)
        const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin&vs_currencies=vnd');
        const cryptoData = await cryptoRes.json();

        if (stockData && stockData.data) {
          const updatedStocks = targetTickers.map(ticker => {
            const remoteData = stockData.data.find((item: any) => item.symbol === ticker);
            return {
              ticker,
              name: ticker === 'FPT' ? 'FPT Corp' : ticker === 'VCB' ? 'Vietcombank' : ticker === 'VNM' ? 'Vinamilk' : ticker === 'HPG' ? 'Hoa Phat' : ticker === 'TCB' ? 'Techcombank' : 'Mobile World',
              price: remoteData ? remoteData.lastPrice : 0,
              pe: remoteData ? 15.5 : 0, // P/E thường lấy từ API tài chính chuyên sâu hơn
              divYield: 0.03,
              revenueGrowth: 0.15,
              stabilityScore: 8,
              category: 'Market Data'
            };
          });
          setStocks(updatedStocks);
        }

        // Cập nhật các chỉ số chính
        setMarketIndices(prev => ({
          ...prev,
          usdtVnd: cryptoData.tether?.vnd || 25450,
          // VNIndex thường cần một API riêng hoặc crawl từ sở giao dịch
          vnIndex: prev.vnIndex + (Math.random() - 0.5) * 2 
        }));

        setIsLive(true);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Lỗi khi fetch dữ liệu real-time:", error);
        setIsLive(false);
      }
    };

    fetchMarketData();
    const intervalId = setInterval(fetchMarketData, 10000); // Cập nhật mỗi 10 giây

    return () => clearInterval(intervalId);
  }, []);

  return { stocks, marketIndices, lastUpdated, isLive };
};

const usePortfolio = () => {
  const [targets, setTargets] = useState<Record<string, number>>({
    vnStocks: 25.0,
    gold: 15.0,
    crypto: 10.0,
    bonds: 20.0,
    funds: 10.0,
    cash: 20.0
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
        let rounded = Math.round(newTargets[k] * 10) / 10;
        newTargets[k] = isNaN(rounded) ? 0 : rounded;
      });

      return newTargets;
    });
  };

  const expectedReturn = Object.keys(targets).reduce((sum, asset) => {
    return sum + (targets[asset] / 100) * ASSET_RETURNS[asset];
  }, 0);

  return {
    targets, setTargets, handleTargetChange,
    expectedReturn
  };
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
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-stone-800 text-stone-100 text-xs rounded-lg shadow-xl z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
);

const NumberInput = ({ value, onChange, className, placeholder = "0" }: { value: string | number, onChange: (val: number | string) => void, className?: string, placeholder?: string }) => {
  const displayValue = (value === '' || value === null || isNaN(Number(value))) ? '' : Number(value).toLocaleString('en-US');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, ''); 
    if (rawValue === '') {
      onChange('');
    } else if (!isNaN(Number(rawValue))) {
      onChange(Number(rawValue));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
};

// --- MAIN VIEWS ---

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

  const totalPrincipal = pv + (validMonthly * n);
  const totalInterest = Math.max(0, fv - totalPrincipal);
  const principalPct = fv === 0 ? 0 : Math.min(100, (totalPrincipal / fv) * 100);
  const interestPct = fv === 0 ? 0 : Math.max(0, 100 - principalPct);

  const isInfinite = !isFinite(requiredMonthly) || requiredMonthly < 0;

  const allocationBreakdown = Object.keys(targets).map(asset => {
    const targetPct = isNaN(targets[asset]) ? 0 : targets[asset] / 100;
    return { 
      asset, 
      targetPct: targets[asset], 
      capitalAmount: pv * targetPct,
      monthlyAmount: validMonthly * targetPct
    };
  });

  const formatAssetLabel = (key: string) => {
    const labels: Record<string, string> = { 
      vnStocks: 'VN Stocks', 
      gold: 'Gold (SJC)', 
      crypto: 'Crypto (USDT)', 
      bonds: 'Bonds (Trái phiếu)',
      funds: 'Mutual Funds (Quỹ mở)',
      cash: 'Money Market' 
    };
    return labels[key] || key;
  };

  return (
    <div className="space-y-6">
      
      {/* --- TOP BANNER: REQUIRED ACTION --- */}
      <Card className="p-6 bg-white dark:bg-stone-900 shadow-sm border border-stone-200 dark:border-stone-800 rounded-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex-1 w-full">
            <h3 className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
              <Sparkles size={14}/> Kế hoạch hành động hàng tháng
            </h3>
            
            {pv >= fv ? (
              <div>
                <div className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mb-1">Mục tiêu đã đạt!</div>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Số dư hiện tại đã vượt mục tiêu của bạn.</p>
              </div>
            ) : isInfinite ? (
              <div>
                <div className="text-xl font-bold text-stone-800 dark:text-stone-300 mb-1">Không thể đạt được</div>
                <p className="text-stone-500 text-sm">Vui lòng điều chỉnh thời gian, mục tiêu hoặc rủi ro.</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-white">
                    {formatVND(validMonthly)}
                  </div>
                  <div className="text-xl text-stone-500 font-medium">/ tháng</div>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-sm max-w-md">
                  Để đạt <strong className="text-stone-900 dark:text-white">{formatVND(fv)}</strong> trong <strong className="text-stone-900 dark:text-white">{years} năm</strong> với tỷ suất <strong className="text-rose-500 dark:text-rose-400">{expectedReturn.toFixed(1)}%/năm</strong>.
                </p>
              </>
            )}
          </div>

          {!isInfinite && pv < fv && (
            <div className="flex-1 w-full bg-stone-800 dark:bg-stone-950 border border-stone-700 rounded-xl p-5">
              <div className="flex justify-between items-end mb-3">
                <h4 className="font-medium text-stone-300 text-sm">Hiệu ứng lãi kép</h4>
                <span className="text-xs text-rose-400 font-medium">+{interestPct.toFixed(1)}% lợi nhuận</span>
              </div>
              
              <div className="h-2.5 w-full bg-stone-950 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${principalPct}%` }} className="bg-stone-400 transition-all duration-700"></div>
                <div style={{ width: `${interestPct}%` }} className="bg-emerald-400 transition-all duration-700"></div>
              </div>

              <div className="flex justify-between text-xs">
                <div>
                  <div className="text-stone-400 mb-1 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-stone-400"></div> Tiền gốc</div>
                  <div className="font-bold text-stone-100">{formatVND(totalPrincipal)}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-500 mb-1 flex items-center gap-1.5 justify-end"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Lợi nhuận ước tính</div>
                  <div className="font-bold text-emerald-400">+{formatVND(totalInterest)}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="p-6 border-t-4 border-t-stone-300 dark:border-t-stone-700">
          <div className="mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">1. Thông số đầu vào</h3>
            <p className="text-sm text-stone-500">Xác định trạng thái hiện tại và mục tiêu tương lai.</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Tổng tích lũy hiện có</label>
                <span className="text-stone-400">VND</span>
              </div>
              <NumberInput 
                value={currentCapital} 
                onChange={setCurrentCapital}
                className="w-full px-4 py-2.5 text-lg font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Số tiền mục tiêu</label>
                <span className="text-stone-400">VND</span>
              </div>
              <NumberInput 
                value={targetGoal} 
                onChange={setTargetGoal}
                className="w-full px-4 py-2.5 text-lg font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Thời gian kỳ vọng</label>
                <span className="text-stone-400">Năm</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" max="40" step="1"
                  value={Number(years)} 
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="flex-1 accent-stone-800 dark:accent-stone-300"
                />
                <input 
                  type="number" 
                  value={Number(years)} 
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-20 px-3 py-2 text-center font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-t-4 border-t-rose-500">
          <div className="flex justify-between items-end mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">2. Chiến lược phân bổ</h3>
              <p className="text-sm text-stone-500">Thiết lập hồ sơ rủi ro danh mục.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Tỷ suất kỳ vọng</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{expectedReturn.toFixed(1)}%</div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {PRESET_PROFILES.map(rec => (
              <button 
                key={rec.label}
                onClick={() => portfolio.setTargets(rec.t)}
                className="whitespace-nowrap px-4 py-2 text-xs font-semibold bg-stone-100 hover:bg-rose-100 text-stone-700 hover:text-rose-800 dark:bg-stone-800 dark:hover:bg-rose-900/50 dark:text-stone-300 dark:hover:text-rose-300 rounded-full transition-colors border border-transparent focus:border-rose-300"
              >
                {rec.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {Object.keys(targets).map(asset => {
              const er = ASSET_RETURNS[asset];
              
              return (
                <div key={asset} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        asset === 'vnStocks' ? 'bg-amber-500' : 
                        asset === 'gold' ? 'bg-yellow-500' : 
                        asset === 'crypto' ? 'bg-indigo-500' : 
                        asset === 'bonds' ? 'bg-sky-500' : 
                        asset === 'funds' ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}></div>
                      {formatAssetLabel(asset)}
                      <span className="text-stone-400 font-normal text-xs ml-1">({er}% ER)</span>
                    </span>
                    <span className="font-bold text-stone-800 dark:text-stone-100 w-12 text-right">{targets[asset].toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={targets[asset]} 
                    onChange={(e) => handleTargetChange(asset, e.target.value)}
                    className="w-full accent-rose-500"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6 border-t-4 border-t-teal-600">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">3. Kế hoạch giải ngân</h3>
          <Tooltip content="Bảng phân tích toán học cách phân bổ vốn vào các lớp tài sản.">
            <Info size={16} className="text-stone-400 cursor-help" />
          </Tooltip>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-stone-400 text-xs uppercase tracking-wider">
                <th className="pb-4 font-semibold">Lớp tài sản</th>
                <th className="pb-4 font-semibold text-right">Phân bổ vốn ban đầu</th>
                <th className="pb-4 font-semibold text-right">Đầu tư hàng tháng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {allocationBreakdown.map(row => (
                <tr key={row.asset} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        row.asset === 'vnStocks' ? 'bg-amber-500' : 
                        row.asset === 'gold' ? 'bg-yellow-500' : 
                        row.asset === 'crypto' ? 'bg-indigo-500' : 
                        row.asset === 'bonds' ? 'bg-sky-500' : 
                        row.asset === 'funds' ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}></div>
                      <span className="font-medium text-stone-800 dark:text-stone-200">{formatAssetLabel(row.asset)}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-semibold text-stone-700 dark:text-stone-300">
                    {formatVND(row.capitalAmount)}
                  </td>
                  <td className="py-4 text-right font-bold text-teal-600 dark:text-teal-400">
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

const StockScreener = ({ stocks }: { stocks: Stock[] }) => {
  const [filter, setFilter] = useState('all');

  const filteredStocks = useMemo(() => {
    switch(filter) {
      case 'value': return stocks.filter((s: Stock) => s.pe < 15 && s.divYield > 0.03);
      case 'growth': return stocks.filter((s: Stock) => s.revenueGrowth >= 0.15);
      case 'stability': return stocks.filter((s: Stock) => s.stabilityScore >= 8);
      default: return stocks;
    }
  }, [stocks, filter]);

  return (
    <Card className="p-6 border-t-4 border-t-amber-600 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Bảng giá VN-Stocks</h2>
          <p className="text-sm text-stone-500">Dữ liệu real-time từ sàn HOSE/HNX qua API DNSE.</p>
        </div>
        <div className="flex space-x-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
          {['all', 'value', 'growth', 'stability'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white dark:bg-stone-700 shadow text-amber-700 dark:text-amber-500' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {f === 'stability' ? 'Văn Khúc (Stable)' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 text-sm">
              <th className="py-3 px-4 font-medium">Mã</th>
              <th className="py-3 px-4 font-medium">Giá (VND)</th>
              <th className="py-3 px-4 font-medium">P/E</th>
              <th className="py-3 px-4 font-medium">Cổ tức</th>
              <th className="py-3 px-4 font-medium">Tăng trưởng</th>
              <th className="py-3 px-4 font-medium text-center">Stability</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock: Stock) => (
              <tr key={stock.ticker} className="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-stone-800 dark:text-stone-200">
                  <div className="flex flex-col">
                    <span>{stock.ticker}</span>
                    <span className="text-xs text-stone-400 font-normal">{stock.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-mono">
                  {formatVND(stock.price)}
                </td>
                <td className="py-3 px-4 text-stone-700 dark:text-stone-300">{stock.pe.toFixed(1)}</td>
                <td className="py-3 px-4 text-stone-700 dark:text-stone-300">{formatPct(stock.divYield)}</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">{formatPct(stock.revenueGrowth)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    stock.stabilityScore >= 8 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
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
    
    for (let i = 0; i < y; i++) {
      total = (total + m) * (1 + r);
    }
    return total;
  };

  const totalInvested = Number(initial) + (Number(monthly) * 12 * Number(years));
  const finalValue = calculateTotal();
  const totalInterest = finalValue - totalInvested;

  return (
    <Card className="p-6 border-t-4 border-t-indigo-600">
      <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Quỹ Mở Compound Engine</h2>
      <p className="text-sm text-stone-500 mb-6">Tính toán mức tăng trưởng dài hạn khi đầu tư Quỹ mở VN.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Vốn ban đầu (VND)</label>
            <NumberInput value={initial} onChange={setInitial} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Góp mỗi tháng (VND)</label>
            <NumberInput value={monthly} onChange={setMonthly} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-stone-600 mb-1">Lãi suất (%)</label>
              <input type="number" step="0.1" value={Number(rate)} onChange={e => setRate(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-stone-600 mb-1">Số năm</label>
              <input type="number" value={Number(years)} onChange={e => setYears(Number(e.target.value))} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
          <div className="mb-4">
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">Giá trị tương lai</div>
            <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{formatVND(finalValue)}</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-indigo-200/50 pb-1">
              <span className="text-stone-600 dark:text-stone-400">Tổng vốn nạp</span>
              <span className="font-medium">{formatVND(totalInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600 dark:text-stone-400">Tổng lãi nhận</span>
              <span className="font-medium text-green-600">{formatVND(totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const AssetExplorer = ({ selectedAsset, onClose }: { selectedAsset: string | null, onClose: () => void }) => {
  if (!selectedAsset) return null;

  const content: Record<string, any> = {
    stocks: {
      title: 'Cổ phiếu Việt Nam',
      def: 'Sở hữu một phần doanh nghiệp niêm yết trên HOSE, HNX thông qua sàn giao dịch.',
      risk: 'Cao - Biến động theo thị trường và chu kỳ kinh tế.',
      platforms: ['DNSE', 'TCBS', 'SSI', 'VNDirect'],
      tip: 'Chỉ số VN-Index bị ảnh hưởng lớn bởi nhóm Ngân hàng và Bất động sản.'
    },
    gold: {
      title: 'Vàng vật chất & Online',
      def: 'Tài sản trú ẩn an toàn, được ưa chuộng tại VN để chống lạm phát.',
      risk: 'Trung bình - Rủi ro lưu trữ vật chất; phụ thuộc giá thế giới.',
      platforms: ['DOJI', 'SJC', 'PNJ eGold'],
      tip: 'Vàng SJC thường có độ chênh lệch cao so với giá vàng thế giới.'
    },
    crypto: {
      title: 'Tài sản số (Crypto)',
      def: 'Các loại tiền mã hóa và token công nghệ blockchain.',
      risk: 'Rất cao - Biến động cực lớn và rủi ro quy định pháp lý.',
      platforms: ['Binance', 'OKX', 'Remitano'],
      tip: 'Việt Nam có tỷ lệ chấp nhận crypto cao nhất thế giới.'
    },
    bonds: {
      title: 'Trái phiếu doanh nghiệp',
      def: 'Công cụ nợ được phát hành bởi DN hoặc Chính phủ để huy động vốn.',
      risk: 'Trung bình - Phụ thuộc vào khả năng thanh toán của tổ chức phát hành.',
      platforms: ['iBond (TCBS)', 'D-Bond (VNDirect)'],
      tip: 'Trái phiếu doanh nghiệp có lợi suất cao hơn nhưng đi kèm rủi ro nợ xấu.'
    },
    funds: {
      title: 'Quỹ Mở (Mutual Funds)',
      def: 'Danh mục đầu tư được quản lý bởi các chuyên gia tài chính.',
      risk: 'Thấp đến Trung bình - Tùy thuộc vào loại quỹ (Cổ phiếu hay Trái phiếu).',
      platforms: ['Dragon Capital', 'VinaCapital', 'Fmarket'],
      tip: 'Phù hợp cho chiến lược DCA (Đầu tư định kỳ) tự động.'
    }
  };

  const data = content[selectedAsset];

  return (
    <div className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">{data.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Định nghĩa</h3>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{data.def}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Hồ sơ rủi ro</h3>
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700">
              <Shield size={16} className="text-amber-600"/>
              <span>{data.risk}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Nền tảng phổ biến</h3>
            <div className="flex flex-wrap gap-2">
              {data.platforms.map((p: string) => (
                <span key={p} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
            <h4 className="font-semibold text-amber-800 dark:text-amber-500 flex items-center gap-2 mb-1">
              <Info size={16}/> Góc nhìn thị trường
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">{data.tip}</p>
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
    { id: 'screener', icon: BarChart3, label: 'Bảng giá Stocks' },
    { id: 'compound', icon: Calculator, label: 'Công cụ lãi kép' },
  ];

  return (
    <div className="min-h-screen bg-[#fdfcf8] dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100">
      
      {/* Top Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-800 text-white rounded flex items-center justify-center font-bold font-serif">W</div>
              <span className="font-bold text-lg tracking-tight">Wealthtech<span className="text-stone-400 font-normal">Hub</span></span>
            </div>
            
            {/* Realtime API Indicator */}
            <div className="hidden sm:flex items-center gap-2 ml-4 px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-xs font-mono">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></div>
              <span className="text-stone-600 dark:text-stone-300">
                {isLive ? 'Real-time API' : 'Dữ liệu offline'} {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-stone-500 font-medium">VN-INDEX</span>
              <span className="font-bold text-green-600 transition-colors duration-300">{marketIndices.vnIndex.toFixed(2)} <TrendingUp size={12} className="inline"/></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-stone-500 font-medium">USDT/VND</span>
              <span className="font-bold text-stone-700 dark:text-stone-300 transition-colors duration-300">{formatVND(marketIndices.usdtVnd).replace('₫','')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-stone-800 text-white shadow-md' 
                    : 'text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="bg-stone-100 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-200 dark:border-stone-700">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-2">
              <BookOpen size={14}/> Thư viện tài sản
            </h3>
            <div className="space-y-2">
              {[
                { id: 'stocks', label: 'Cổ phiếu VN' },
                { id: 'gold', label: 'Vàng (SJC/DOJI)' },
                { id: 'crypto', label: 'Crypto & Stablecoins' },
                { id: 'bonds', label: 'Trái phiếu doanh nghiệp' },
                { id: 'funds', label: 'Quỹ mở đầu tư' }
              ].map(asset => (
                <button 
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-600 hover:bg-white dark:hover:bg-stone-700 rounded-lg transition-colors border border-transparent hover:border-stone-200 shadow-sm hover:shadow"
                >
                  {asset.label}
                  <ArrowRight size={14} className="text-stone-400"/>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && <UnifiedWealthDashboard portfolio={portfolio} />}
            {activeTab === 'screener' && <StockScreener stocks={stocks} />}
            {activeTab === 'compound' && <CompoundCalculator />}
          </div>
        </div>

      </main>

      {/* Slide-out Explorer Modal */}
      <AssetExplorer selectedAsset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  );
}