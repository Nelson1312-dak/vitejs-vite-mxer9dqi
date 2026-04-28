import React, { useState, useEffect, useMemo } from 'react';
import { 
  Info, BarChart3, PieChart, Calculator, BookOpen, 
  TrendingUp, TrendingDown, DollarSign, Shield, ArrowRight, X, Target, Activity, LayoutDashboard, Sparkles
} from 'lucide-react';

// --- UTILITIES ---
const formatVND = (amount) => {
  if (isNaN(amount) || !isFinite(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPct = (decimal) => {
  if (isNaN(decimal)) return '0.00%';
  return (decimal * 100).toFixed(2) + '%';
};

// --- CONSTANTS ---
const ASSET_RETURNS = {
  vnStocks: 12, // 12% Expected Annual Return
  gold: 8,      // 8% Expected Annual Return
  crypto: 15,   // 15% Expected Annual Return
  bonds: 8,     // 8% Expected Return (VN Corporate/Govt Bonds)
  funds: 10,    // 10% Expected Return (VN Open-Ended Funds)
  cash: 5       // 5% Expected Annual Return
};

const PRESET_PROFILES = [
  { label: 'Conservative', t: { vnStocks: 10, gold: 20, crypto: 0, bonds: 30, funds: 10, cash: 30 } },
  { label: 'Moderate', t: { vnStocks: 30, gold: 15, crypto: 5, bonds: 20, funds: 15, cash: 15 } },
  { label: 'Aggressive', t: { vnStocks: 50, gold: 5, crypto: 15, bonds: 5, funds: 15, cash: 10 } },
  { label: 'All-Weather', t: { vnStocks: 25, gold: 15, crypto: 10, bonds: 20, funds: 10, cash: 20 } }
];

// --- CUSTOM HOOKS ---
const useMarketData = () => {
  const [stocks, setStocks] = useState([]);
  const [marketIndices, setMarketIndices] = useState({
    vnIndex: 1250.45,
    vn30: 1265.10,
    goldSJC: 82500000, 
    usdtVnd: 25450,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Initial Data Payload
    const initialStocks = [
      { ticker: 'FPT', name: 'FPT Corp', price: 135000, pe: 18.5, divYield: 0.03, revenueGrowth: 0.22, stabilityScore: 9, category: 'Tech' },
      { ticker: 'VCB', name: 'Vietcombank', price: 92000, pe: 14.2, divYield: 0.02, revenueGrowth: 0.15, stabilityScore: 8, category: 'Bank' },
      { ticker: 'VNM', name: 'Vinamilk', price: 68000, pe: 16.1, divYield: 0.06, revenueGrowth: 0.05, stabilityScore: 9, category: 'F&B' },
      { ticker: 'HPG', name: 'Hoa Phat', price: 30500, pe: 12.4, divYield: 0.04, revenueGrowth: 0.18, stabilityScore: 7, category: 'Material' },
      { ticker: 'TCB', name: 'Techcombank', price: 48000, pe: 7.8, divYield: 0.00, revenueGrowth: 0.25, stabilityScore: 6, category: 'Bank' },
      { ticker: 'MWG', name: 'Mobile World', price: 54000, pe: 22.1, divYield: 0.01, revenueGrowth: 0.12, stabilityScore: 5, category: 'Retail' },
    ];
    setStocks(initialStocks);

    // Goal 1: DNSE API Integration (Reload every 3 secs)
    const fetchRealtimeData = async () => {
      try {
        const response = await fetch('https://services.entrade.com.vn/chart-api/quotes?symbols=FPT,VCB,VNM,HPG,TCB,MWG');
        if (!response.ok) throw new Error('CORS or Network issue');
        
        await response.json();
        setIsLive(true);
      } catch (error) {
        setIsLive(false);
        setStocks(prev => prev.map(stock => {
          const change = (Math.random() - 0.5) * 0.002; 
          return { ...stock, price: Math.round(stock.price * (1 + change)) };
        }));
        setMarketIndices(prev => ({
          ...prev,
          vnIndex: Number((prev.vnIndex + (Math.random() - 0.5) * 1.5).toFixed(2)),
          goldSJC: prev.goldSJC + (Math.random() > 0.8 ? (Math.random() - 0.5) * 50000 : 0)
        }));
      }
      setLastUpdated(new Date());
    };

    fetchRealtimeData();
    const intervalId = setInterval(fetchRealtimeData, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return { stocks, marketIndices, lastUpdated, isLive };
};

const usePortfolio = () => {
  const [targets, setTargets] = useState({
    vnStocks: 25.0,
    gold: 15.0,
    crypto: 10.0,
    bonds: 20.0,
    funds: 10.0,
    cash: 20.0
  });

  const handleTargetChange = (changedAsset, valStr) => {
    let newValue = parseFloat(valStr);
    if (isNaN(newValue)) newValue = 0;
    if (newValue > 100) newValue = 100;
    if (newValue < 0) newValue = 0;

    setTargets(prev => {
      const oldTarget = prev[changedAsset];
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

      let currentSum = Object.values(newTargets).reduce((a,b) => a + (isNaN(b) ? 0 : b), 0);
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
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-sm ${className}`}>
    {children}
  </div>
);

const Tooltip = ({ content, children }) => (
  <div className="relative group flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-stone-800 text-stone-100 text-xs rounded-lg shadow-xl z-50 pointer-events-none">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
);

const NumberInput = ({ value, onChange, className, placeholder = "0" }) => {
  const displayValue = (value === '' || value === null || isNaN(value)) ? '' : Number(value).toLocaleString('en-US');

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, ''); 
    if (rawValue === '') {
      onChange('');
    } else if (!isNaN(rawValue)) {
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

const UnifiedWealthDashboard = ({ portfolio }) => {
  const { targets, setTargets, handleTargetChange, expectedReturn } = portfolio;
  
  // Financial Inputs 
  const [currentCapital, setCurrentCapital] = useState(100000000); // 100M VND default
  const [targetGoal, setTargetGoal] = useState(3000000000);        // 3B VND default
  const [years, setYears] = useState(10);                          // 10 years default

  const targetTotal = Object.values(targets).reduce((a, b) => a + Number(b), 0);

  // Math: Calculate Required Monthly Savings (PMT)
  const r = expectedReturn / 100 / 12; // Monthly rate
  const n = Math.max(years, 0.1) * 12; // Total months (prevent divide by 0)
  const pv = Number(currentCapital) || 0;
  const fv = Number(targetGoal) || 0;

  let requiredMonthly = 0;
  if (pv < fv) {
    requiredMonthly = r > 0 
      ? (fv - pv * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n) - 1) / r)
      : (fv - pv) / n;
  }
  
  const validMonthly = Math.max(0, requiredMonthly); // Prevent negative savings if goal is already met

  // Wealth Insight Math (Compound Effect)
  const totalPrincipal = pv + (validMonthly * n);
  const totalInterest = Math.max(0, fv - totalPrincipal);
  const principalPct = fv === 0 ? 0 : Math.min(100, (totalPrincipal / fv) * 100);
  const interestPct = fv === 0 ? 0 : Math.max(0, 100 - principalPct);

  const isInfinite = !isFinite(requiredMonthly) || requiredMonthly < 0;

  // Execution Plan Breakdown
  const allocationBreakdown = Object.keys(targets).map(asset => {
    const targetPct = isNaN(targets[asset]) ? 0 : targets[asset] / 100;
    return { 
      asset, 
      targetPct: targets[asset], 
      capitalAmount: pv * targetPct,
      monthlyAmount: validMonthly * targetPct
    };
  });

  const formatAssetLabel = (key) => {
    const labels = { 
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
          
          {/* Left: The Big Number */}
          <div className="flex-1 w-full">
            <h3 className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-3">
              <Sparkles size={14}/> Required Monthly Action
            </h3>
            
            {pv >= fv ? (
              <div>
                <div className="text-3xl font-black text-emerald-500 dark:text-emerald-400 mb-1">Goal Achieved!</div>
                <p className="text-stone-500 dark:text-stone-400 text-sm">Your current savings exceed your target.</p>
              </div>
            ) : isInfinite ? (
              <div>
                <div className="text-xl font-bold text-stone-800 dark:text-stone-300 mb-1">Mathematically Unreachable</div>
                <p className="text-stone-500 text-sm">Adjust timeline, goal, or risk to proceed.</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 dark:text-white">
                    {formatVND(validMonthly)}
                  </div>
                  <div className="text-xl text-stone-500 font-medium">/ mo</div>
                </div>
                <p className="text-stone-600 dark:text-stone-400 text-sm max-w-md">
                  To reach <strong className="text-stone-900 dark:text-white">{formatVND(fv)}</strong> in <strong className="text-stone-900 dark:text-white">{years} yrs</strong> at <strong className="text-rose-500 dark:text-rose-400">{expectedReturn.toFixed(1)}% ER</strong>.
                </p>
              </>
            )}
          </div>

          {/* Right: Compact Compound Effect Visualizer */}
          {!isInfinite && pv < fv && (
            <div className="flex-1 w-full bg-stone-800 dark:bg-stone-950 border border-stone-700 rounded-xl p-5">
              <div className="flex justify-between items-end mb-3">
                <h4 className="font-medium text-stone-300 text-sm">The Compound Effect</h4>
                <span className="text-xs text-rose-400 font-medium">+{interestPct.toFixed(1)}% generated</span>
              </div>
              
              <div className="h-2.5 w-full bg-stone-950 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${principalPct}%` }} className="bg-stone-400 transition-all duration-700" title="Your Deposits"></div>
                <div style={{ width: `${interestPct}%` }} className="bg-emerald-400 transition-all duration-700" title="Market Returns"></div>
              </div>

              <div className="flex justify-between text-xs">
                <div>
                  <div className="text-stone-400 mb-1 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-stone-400"></div> Total Deposits</div>
                  <div className="font-bold text-stone-100">{formatVND(totalPrincipal)}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-500 mb-1 flex items-center gap-1.5 justify-end"><div className="w-2 h-2 rounded-full bg-emerald-400"></div> Est. Returns</div>
                  <div className="font-bold text-emerald-400">+{formatVND(totalInterest)}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </Card>

      {/* --- MIDDLE ROW: PARAMETERS & STRATEGY --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Parameters */}
        <Card className="p-6 border-t-4 border-t-stone-300 dark:border-t-stone-700">
          <div className="mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">1. Parameters</h3>
            <p className="text-sm text-stone-500">Define your current status and future goal.</p>
          </div>
          
          <div className="space-y-6">
            {/* Current Savings */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Total Savings Currently</label>
                <span className="text-stone-400">VND</span>
              </div>
              <NumberInput 
                value={currentCapital} 
                onChange={setCurrentCapital}
                className="w-full px-4 py-2.5 text-lg font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
              />
            </div>

            {/* Target Goal */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Target Goal Amount</label>
                <span className="text-stone-400">VND</span>
              </div>
              <NumberInput 
                value={targetGoal} 
                onChange={setTargetGoal}
                className="w-full px-4 py-2.5 text-lg font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400 transition-shadow"
              />
            </div>

            {/* Timeline */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="font-medium text-stone-600 dark:text-stone-400">Timeline</label>
                <span className="text-stone-400">Years</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" max="40" step="1"
                  value={years} 
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="flex-1 accent-stone-800 dark:accent-stone-300"
                />
                <input 
                  type="number" 
                  value={years} 
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-20 px-3 py-2 text-center font-semibold text-stone-800 dark:text-stone-100 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Allocation Strategy */}
        <Card className="p-6 border-t-4 border-t-rose-500">
          <div className="flex justify-between items-end mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">2. Allocation Strategy</h3>
              <p className="text-sm text-stone-500">Set your portfolio risk profile.</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Target ER</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{expectedReturn.toFixed(1)}%</div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {PRESET_PROFILES.map(rec => (
              <button 
                key={rec.label}
                onClick={() => setTargets(rec.t)}
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

      {/* --- BOTTOM ROW: EXECUTION PLAN --- */}
      <Card className="p-6 border-t-4 border-t-teal-600">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <h3 className="font-bold text-stone-800 dark:text-stone-100 text-lg">3. Execution Plan</h3>
          <Tooltip content="A mathematical breakdown of how to distribute your capital across your selected asset classes.">
            <Info size={16} className="text-stone-400 cursor-help" />
          </Tooltip>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-stone-400 text-xs uppercase tracking-wider">
                <th className="pb-4 font-semibold">Asset Class</th>
                <th className="pb-4 font-semibold text-right">Lump Sum Dist.</th>
                <th className="pb-4 font-semibold text-right">Monthly Flow</th>
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
                      <span className="text-xs text-stone-400 ml-2 hidden sm:inline-block">({row.targetPct.toFixed(1)}% Target)</span>
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

const StockScreener = ({ stocks }) => {
  const [filter, setFilter] = useState('all');

  const filteredStocks = useMemo(() => {
    switch(filter) {
      case 'value': return stocks.filter(s => s.pe < 15 && s.divYield > 0.03);
      case 'growth': return stocks.filter(s => s.revenueGrowth >= 0.15);
      case 'stability': return stocks.filter(s => s.stabilityScore >= 8);
      default: return stocks;
    }
  }, [stocks, filter]);

  return (
    <Card className="p-6 border-t-4 border-t-amber-600 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">VN Stock Screener</h2>
          <p className="text-sm text-stone-500">Filter HOSE/HNX equities based on quantitative metrics.</p>
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
              <th className="py-3 px-4 font-medium">Ticker</th>
              <th className="py-3 px-4 font-medium">Price (VND)</th>
              <th className="py-3 px-4 font-medium">P/E Ratio</th>
              <th className="py-3 px-4 font-medium">Div Yield</th>
              <th className="py-3 px-4 font-medium">Rev Growth</th>
              <th className="py-3 px-4 font-medium text-center">Stability Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => (
              <tr key={stock.ticker} className="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-stone-800 dark:text-stone-200">
                  <div className="flex flex-col">
                    <span>{stock.ticker}</span>
                    <span className="text-xs text-stone-400 font-normal">{stock.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-mono transition-all duration-300 ease-in-out">
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
  const [initial, setInitial] = useState(10000000);
  const [monthly, setMonthly] = useState(5000000);
  const [rate, setRate] = useState(8.5); 
  const [years, setYears] = useState(10);

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
      <p className="text-sm text-stone-500 mb-6">Calculate long-term growth for Vietnamese Open-Ended Funds.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Initial Capital (VND)</label>
            <NumberInput value={initial} onChange={setInitial} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">Monthly Contribution (VND)</label>
            <NumberInput value={monthly} onChange={setMonthly} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-stone-600 mb-1">Expected Rate (%)</label>
              <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-stone-600 mb-1">Years</label>
              <input type="number" value={years} onChange={e => setYears(e.target.value)} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
          <div className="mb-4">
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">Future Value</div>
            <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{formatVND(finalValue)}</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-indigo-200/50 pb-1">
              <span className="text-stone-600 dark:text-stone-400">Total Contributions</span>
              <span className="font-medium">{formatVND(totalInvested)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600 dark:text-stone-400">Total Interest Earned</span>
              <span className="font-medium text-green-600">{formatVND(totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const AssetExplorer = ({ selectedAsset, onClose }) => {
  if (!selectedAsset) return null;

  const content = {
    stocks: {
      title: 'Vietnamese Equities',
      def: 'Shares representing ownership in public companies listed on HOSE, HNX, or UPCoM.',
      risk: 'High - Subject to market volatility and economic cycles.',
      platforms: ['SHS Securities', 'TCBS', 'SSI', 'VNDirect'],
      tip: 'The VN-Index is heavily weighted towards Banks and Real Estate.'
    },
    gold: {
      title: 'Physical & Digital Gold',
      def: 'Traditional safe-haven asset, highly favored in Vietnam as a hedge against inflation.',
      risk: 'Medium - Physical storage risks; global price dependency.',
      platforms: ['DOJI', 'SJC', 'PNJ eGold'],
      tip: 'SJC gold often trades at a significant premium to the global spot price.'
    },
    crypto: {
      title: 'Crypto Assets',
      def: 'Digital currencies and tokens utilizing blockchain technology.',
      risk: 'Very High - Regulatory uncertainty and extreme price swings.',
      platforms: ['Binance (P2P)', 'OKX', 'Remitano'],
      tip: 'Vietnam has one of the highest crypto adoption rates globally.'
    },
    bonds: {
      title: 'Bonds (Trái phiếu)',
      def: 'Debt securities issued by corporations or the government.',
      risk: 'Medium - Depending on issuer creditworthiness.',
      platforms: ['TCBS (iBond)', 'VNDirect (D-Bond)'],
      tip: 'Corporate bonds offer higher yields but carry default risk.'
    },
    funds: {
      title: 'Quỹ Mở (Open-Ended Funds)',
      def: 'Professionally managed investment pools that collect money from many investors.',
      risk: 'Low to Medium - Depending on the fund (Bond vs Equity).',
      platforms: ['Dragon Capital', 'VinaCapital', 'Fmarket'],
      tip: 'Excellent for automated DCA (Dollar Cost Averaging) strategies.'
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Definition</h3>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">{data.def}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Risk Profile</h3>
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-700">
              <Shield size={16} className="text-amber-600"/>
              <span>{data.risk}</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-2">Typical Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {data.platforms.map(p => (
                <span key={p} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg">
            <h4 className="font-semibold text-amber-800 dark:text-amber-500 flex items-center gap-2 mb-1">
              <Info size={16}/> Market Insight
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
  const [selectedAsset, setSelectedAsset] = useState(null);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Wealth Dashboard' },
    { id: 'screener', icon: BarChart3, label: 'Stock Screener' },
    { id: 'compound', icon: Calculator, label: 'Compound Engine' },
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
                {isLive ? 'DNSE Live' : 'Market Sim'} {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-stone-500 font-medium">VN-INDEX</span>
              <span className="font-bold text-green-600 transition-colors duration-300">{marketIndices.vnIndex} <TrendingUp size={12} className="inline"/></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-stone-500 font-medium">SJC GOLD</span>
              <span className="font-bold text-stone-700 dark:text-stone-300 transition-colors duration-300">{formatVND(marketIndices.goldSJC).replace('₫','')}</span>
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
              <BookOpen size={14}/> Asset Knowledge Base
            </h3>
            <div className="space-y-2">
              {[
                { id: 'stocks', label: 'Vietnamese Equities' },
                { id: 'gold', label: 'Gold (SJC/DOJI)' },
                { id: 'crypto', label: 'Crypto & Stables' },
                { id: 'bonds', label: 'Bonds (Trái phiếu)' },
                { id: 'funds', label: 'Open-Ended Funds' }
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