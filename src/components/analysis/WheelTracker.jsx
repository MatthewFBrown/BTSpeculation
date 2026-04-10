import { useState, useMemo, useRef, useEffect } from 'react'
import { calcPnL, fmt } from '../../utils/calculations'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, DollarSign, Calculator, HelpCircle } from 'lucide-react'

/* ─── InfoTip ─────────────────────────────────────────────────────── */
function InfoTip({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-slate-500 hover:text-slate-300 transition-colors align-middle"
        type="button"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <div className="absolute z-50 left-5 top-0 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 text-xs text-slate-300 leading-relaxed">
          {children}
          <button onClick={() => setOpen(false)} className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-base leading-none">×</button>
        </div>
      )}
    </span>
  )
}

const SUB_TABS = [
  { id: 'positions', label: 'Wheel Positions', icon: RotateCcw },
  { id: 'premium',   label: 'Premium Income',  icon: DollarSign },
  { id: 'strikes',   label: 'Strike Calculator', icon: Calculator },
]

/* ─── helpers ─────────────────────────────────────────────────────── */

function premiumCollected(trade) {
  // For short options: premium collected = entryPrice * qty * 100
  const entry = parseFloat(trade.entryPrice) || 0
  const qty   = parseFloat(trade.quantity) || 1
  return entry * qty * 100
}

function premiumPaidToClose(trade) {
  const exit = parseFloat(trade.exitPrice) || 0
  const qty  = parseFloat(trade.quantity) || 1
  return exit * qty * 100
}

function netPremium(trade) {
  return premiumCollected(trade) - premiumPaidToClose(trade) - (parseFloat(trade.fees) || 0)
}

function daysHeld(trade) {
  const start = trade.entryDate ? new Date(trade.entryDate) : null
  const end   = trade.exitDate  ? new Date(trade.exitDate) : new Date()
  if (!start) return 0
  return Math.max(1, Math.round((end - start) / 86400000))
}

function capitalRequired(trade) {
  const strike = parseFloat(trade.strike) || 0
  const qty    = parseFloat(trade.quantity) || 1
  return strike * qty * 100
}

function annualizedReturn(premium, capital, days) {
  if (!capital || !days) return 0
  return (premium / capital) * (365 / days) * 100
}

function stageLabel(stage) {
  switch (stage) {
    case 'selling_puts':   return 'Selling Puts'
    case 'holding_shares': return 'Holding Shares'
    case 'selling_calls':  return 'Selling Calls'
    case 'idle':           return 'No Open Positions'
    default:               return stage
  }
}

function stageBadge(stage) {
  switch (stage) {
    case 'selling_puts':   return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'holding_shares': return 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    case 'selling_calls':  return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'idle':           return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    default:               return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

/* ─── build wheel positions from trades + investments ─────────────── */

function buildWheelPositions(trades, investments = []) {
  const optionTrades = trades.filter(t => t.type === 'option' && t.direction === 'short')

  // Convert Option-type investments into the same shape as day-trading option trades
  const invOptions = investments
    .filter(inv => inv.assetType === 'Option')
    .map(inv => ({
      id:         inv.id,
      type:       'option',
      symbol:     (inv.symbol || '').toUpperCase(),
      optionType: inv.optionType || 'put',
      direction:  inv.optionDirection || 'short',
      strike:     inv.strike || '',
      expiry:     inv.expiry || '',
      quantity:   inv.shares || '1',          // contracts stored in shares field
      entryPrice: inv.avgCost || '0',         // entry premium stored in avgCost
      exitPrice:  inv.sellPrice || inv.currentPrice || '0',
      entryDate:  inv.buyDate || '',
      exitDate:   inv.sellDate || '',
      status:     inv.status === 'closed' ? 'closed' : 'open',
      fees:       '0',
      _fromInvestments: true,
    }))

  // Merge: day-trading short options + investment options (short only for wheel)
  const allOptionTrades = [
    ...optionTrades,
    ...invOptions.filter(t => t.direction === 'short'),
  ]

  // Collect all symbols from options AND share investments
  const symbolSet = new Set()
  allOptionTrades.forEach(t => { if (t.symbol) symbolSet.add(t.symbol.toUpperCase()) })
  investments.filter(inv => inv.assetType !== 'Option').forEach(inv => {
    if (inv.symbol) symbolSet.add(inv.symbol.toUpperCase())
  })

  return Array.from(symbolSet).map(symbol => {
    const symTrades = allOptionTrades.filter(t => t.symbol?.toUpperCase() === symbol)
    const csps = symTrades.filter(t => t.optionType === 'put')
    const ccs  = symTrades.filter(t => t.optionType === 'call')

    // Matching investment positions (shares held — exclude Option type)
    const sharePositions = investments.filter(inv =>
      inv.symbol?.toUpperCase() === symbol && inv.assetType !== 'Crypto' && inv.assetType !== 'Option'
    )
    const openShares = sharePositions.filter(inv => inv.status === 'open')

    const allTrades = [...csps, ...ccs].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate))
    const openCSPs  = csps.filter(t => t.status === 'open')
    const openCCs   = ccs.filter(t => t.status === 'open')

    // Stage: options take precedence; shares alone = holding
    let stage = 'idle'
    if (openCSPs.length > 0)       stage = 'selling_puts'
    else if (openCCs.length > 0)   stage = 'selling_calls'
    else if (openShares.length > 0) stage = 'holding_shares'

    const totalPremiumCollected = allTrades.reduce((sum, t) => sum + premiumCollected(t), 0)
    const totalPaidToClose      = allTrades.reduce((sum, t) => sum + premiumPaidToClose(t), 0)
    const totalFees             = allTrades.reduce((sum, t) => sum + (parseFloat(t.fees) || 0), 0)
    const totalNet              = totalPremiumCollected - totalPaidToClose - totalFees

    // Share position details
    const totalShares    = openShares.reduce((s, inv) => s + (parseFloat(inv.shares) || 0), 0)
    const avgCost        = totalShares > 0
      ? openShares.reduce((s, inv) => s + (parseFloat(inv.avgCost) || 0) * (parseFloat(inv.shares) || 0), 0) / totalShares
      : 0
    const currentPrice   = openShares.length > 0
      ? parseFloat(openShares[openShares.length - 1].currentPrice) || 0 : 0
    // Effective cost basis = avgCost adjusted by premiums collected per share
    const effectiveCost  = totalShares > 0 ? avgCost - (totalNet / totalShares) : 0

    // Capital at risk
    const openPutCapital = openCSPs.reduce((max, t) => Math.max(max, capitalRequired(t)), 0)
    const sharesCapital  = totalShares * avgCost
    const maxCapitalEver = [...csps].reduce((max, t) => Math.max(max, capitalRequired(t)), 0)
    const currentCapital = openPutCapital || sharesCapital || maxCapitalEver

    const totalDays = allTrades.reduce((sum, t) => sum + daysHeld(t), 0)
    const annReturn = annualizedReturn(totalNet, currentCapital, totalDays || 1)

    const closed = allTrades.filter(t => t.status === 'closed')
    const wins   = closed.filter(t => netPremium(t) > 0).length

    return {
      symbol,
      stage,
      csps,
      ccs,
      allTrades,
      totalPremiumCollected,
      totalNet,
      totalFees,
      currentCapital,
      annReturn,
      totalTrades: allTrades.length,
      closedTrades: closed.length,
      openTrades: openCSPs.length + openCCs.length,
      winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
      // Share position
      openShares,
      totalShares,
      avgCost,
      currentPrice,
      effectiveCost,
      sharePositions,
    }
  }).sort((a, b) => b.totalNet - a.totalNet)
}

/* ─── SUB-COMPONENT: Wheel Positions ──────────────────────────────── */

function WheelPositions({ positions }) {
  const [expanded, setExpanded] = useState(null)

  if (positions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <RotateCcw size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No wheel positions found.</p>
        <p className="text-xs mt-1">Add short put or short call trades in the Day Trading section, or stock positions in Investments, to track your wheel strategy.</p>
      </div>
    )
  }

  // Summary stats
  const totalNet     = positions.reduce((s, p) => s + p.totalNet, 0)
  const totalCapital = positions.reduce((s, p) => s + p.currentCapital, 0)
  const activeCount  = positions.filter(p => p.stage !== 'idle').length

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Net Premium" value={fmt(totalNet)} color={totalNet >= 0 ? 'text-green-400' : 'text-red-400'}
          info="Total premium collected minus buyback costs and fees across all wheel trades." />
        <StatCard label="Capital Deployed" value={fmt(totalCapital)} color="text-slate-100"
          info="Cash tied up as collateral. For CSPs: strike × 100 × contracts. For CCs: the cost of your shares." />
        <StatCard label="Active Wheels" value={activeCount} color="text-blue-400"
          info="Symbols currently in an active wheel stage (selling puts or selling calls)." />
        <StatCard label="Symbols Traded" value={positions.length} color="text-slate-100"
          info="Total number of underlying symbols you have or have had wheel trades on." />
      </div>

      {/* Position cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Stages:</span>
          <span className="px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/30">Selling Puts</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-full border bg-sky-500/20 text-sky-300 border-sky-500/30">Holding Shares</span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/30">Selling Calls</span>
          <span>→ repeat</span>
          <InfoTip>
            <p className="font-semibold mb-1">How the Wheel works</p>
            <p className="mb-1"><span className="text-purple-300 font-semibold">Selling Puts:</span> You sold a cash-secured put. You collect premium and are obligated to buy 100 shares at the strike if the stock falls below it at expiry.</p>
            <p className="mb-1"><span className="text-amber-300 font-semibold">Selling Calls:</span> You own shares (were assigned or bought them) and are selling covered calls above your cost basis to collect more premium.</p>
            <p><span className="text-slate-400 font-semibold">Idle:</span> No open positions on this symbol — the wheel has completed or hasn't started yet.</p>
            <p className="mt-2 text-slate-400">Trades are detected automatically from your short options in the Day Trading section.</p>
          </InfoTip>
        </div>
        {positions.map(pos => (
          <div key={pos.symbol} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpanded(expanded === pos.symbol ? null : pos.symbol)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
            >
              <span className="text-base font-bold text-slate-100 w-16">{pos.symbol}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${stageBadge(pos.stage)}`}>
                {stageLabel(pos.stage)}
              </span>
              <div className="flex-1" />
              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-500 mr-4">{pos.totalTrades} trades</span>
                <span className="text-xs text-slate-500 mr-4">{pos.winRate.toFixed(0)}% win</span>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${pos.totalNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(pos.totalNet)}
              </span>
              <span className={`text-xs tabular-nums ${pos.annReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {pos.annReturn.toFixed(1)}% ann.
              </span>
              <svg className={`w-4 h-4 text-slate-500 transition-transform ${expanded === pos.symbol ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Expanded detail */}
            {expanded === pos.symbol && (
              <div className="border-t border-slate-700 px-4 py-3 space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Premium Collected </span>
                    <InfoTip>Gross credit received across all short puts and calls on this symbol (entry price × contracts × 100).</InfoTip>
                    <br /><span className="text-slate-200 font-medium">{fmt(pos.totalPremiumCollected)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fees Paid </span>
                    <InfoTip>Total commissions and fees entered on trades for this symbol.</InfoTip>
                    <br /><span className="text-red-400 font-medium">{fmt(pos.totalFees)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Capital at Risk </span>
                    <InfoTip>Cash reserved as collateral. For open CSPs: strike × 100 × contracts. Represents the maximum loss if the stock goes to zero and you don't close the position.</InfoTip>
                    <br /><span className="text-slate-200 font-medium">{fmt(pos.currentCapital)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Open Positions </span>
                    <InfoTip>Number of currently open (unexpired/unclosed) options on this symbol.</InfoTip>
                    <br /><span className="text-slate-200 font-medium">{pos.openTrades}</span>
                  </div>
                </div>

                {/* Share position block */}
                {pos.openShares.length > 0 && (
                  <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1">
                      Share Position (Investments)
                      <InfoTip>
                        <p className="font-semibold mb-1">Share position</p>
                        <p className="mb-1">These are your stock holdings from the <span className="text-sky-300">Investments</span> section, matched by symbol. They represent shares you hold between wheel cycles — either purchased outright or acquired via put assignment.</p>
                        <p><span className="text-sky-300">Effective cost basis</span> deducts all net premium collected on this symbol from your average cost, showing your true break-even price per share.</p>
                      </InfoTip>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Shares Held</span>
                        <br /><span className="text-sky-300 font-semibold">{pos.totalShares.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Avg Cost</span>
                        <br /><span className="text-slate-200 font-mono">${pos.avgCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Effective Cost </span>
                        <InfoTip>Average cost minus net premium collected per share. This is your true break-even — the stock needs to fall below this to cause a real loss.</InfoTip>
                        <br /><span className={`font-mono font-semibold ${pos.effectiveCost < pos.avgCost ? 'text-green-400' : 'text-slate-200'}`}>${pos.effectiveCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Current Price</span>
                        <br />
                        {pos.currentPrice > 0 ? (
                          <span className={`font-mono font-semibold ${pos.currentPrice >= pos.effectiveCost ? 'text-green-400' : 'text-red-400'}`}>
                            ${pos.currentPrice.toFixed(2)}
                            <span className="text-slate-500 font-normal ml-1">
                              ({pos.currentPrice >= pos.effectiveCost ? '+' : ''}{((pos.currentPrice - pos.effectiveCost) / pos.effectiveCost * 100).toFixed(1)}%)
                            </span>
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </div>
                    </div>
                    {pos.openShares.length > 1 && (
                      <div className="mt-2 space-y-1">
                        {pos.openShares.map((inv, i) => (
                          <div key={inv.id || i} className="flex items-center gap-3 text-xs text-slate-400 bg-slate-900/40 rounded px-2 py-1">
                            <span className="text-slate-300 font-medium">{inv.name || inv.symbol}</span>
                            <span>{parseFloat(inv.shares).toFixed(0)} shares @ ${parseFloat(inv.avgCost).toFixed(2)}</span>
                            <span className="text-slate-600">bought {inv.buyDate || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Trade timeline */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Options Trade History</p>
                  <div className="space-y-1">
                    {pos.allTrades.map((t, i) => {
                      const net = netPremium(t)
                      const isPut = t.optionType === 'put'
                      return (
                        <div key={t.id || i} className="flex items-center gap-2 text-xs bg-slate-900/50 rounded-lg px-3 py-2">
                          <span className="shrink-0">
                            {isPut ? <ArrowDownCircle size={14} className="text-purple-400" /> : <ArrowUpCircle size={14} className="text-amber-400" />}
                          </span>
                          <span className={`w-8 font-semibold ${isPut ? 'text-purple-300' : 'text-amber-300'}`}>{isPut ? 'CSP' : 'CC'}</span>
                          {t._fromInvestments && <span className="text-[9px] text-slate-600 bg-slate-700 rounded px-1">INV</span>}
                          <span className="text-slate-400 w-12">${parseFloat(t.strike).toFixed(0)}</span>
                          <span className="text-slate-500 w-20">{t.expiry || '—'}</span>
                          <span className="text-slate-500 w-6 text-center">{t.quantity}x</span>
                          <span className={`text-slate-400 w-16`}>${parseFloat(t.entryPrice).toFixed(2)} cr</span>
                          <div className="flex-1" />
                          <span className={`font-medium tabular-nums ${t.status === 'open' ? 'text-blue-400' : net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {t.status === 'open' ? 'OPEN' : fmt(net)}
                          </span>
                          <span className="text-slate-600 w-16 text-right">{t.entryDate || ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── SUB-COMPONENT: Premium Income ───────────────────────────────── */

function PremiumIncome({ positions }) {
  // All closed short option trades — merged from Day Trading + Investments
  const shortTrades = useMemo(() =>
    positions
      .flatMap(p => p.allTrades)
      .filter(t => t.status === 'closed')
      .sort((a, b) => new Date(a.exitDate || a.entryDate) - new Date(b.exitDate || b.entryDate)),
    [positions]
  )

  // Premium by symbol (bar chart)
  const bySymbol = useMemo(() =>
    positions.map(p => ({ symbol: p.symbol, premium: p.totalNet })).sort((a, b) => b.premium - a.premium),
    [positions]
  )

  // Cumulative premium over time (line chart)
  const cumulative = useMemo(() => {
    let running = 0
    return shortTrades.map(t => {
      running += netPremium(t)
      return { date: t.exitDate || t.entryDate, premium: running }
    })
  }, [shortTrades])

  // Monthly premium (bar chart)
  const monthly = useMemo(() => {
    const map = {}
    shortTrades.forEach(t => {
      const month = (t.exitDate || t.entryDate || '').slice(0, 7)
      if (!month) return
      if (!map[month]) map[month] = { month, premium: 0, trades: 0 }
      map[month].premium += netPremium(t)
      map[month].trades++
    })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [shortTrades])

  const totalNet = positions.reduce((s, p) => s + p.totalNet, 0)
  const totalCollected = positions.reduce((s, p) => s + p.totalPremiumCollected, 0)
  const totalFees = positions.reduce((s, p) => s + p.totalFees, 0)
  const avgMonthly = monthly.length > 0 ? totalNet / monthly.length : 0

  // Open premium (unrealized) — merged from Day Trading + Investments
  const openTrades = positions.flatMap(p => p.allTrades).filter(t => t.status === 'open')
  const openPremium = openTrades.reduce((s, t) => s + premiumCollected(t), 0)

  if (shortTrades.length === 0 && openTrades.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <DollarSign size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No premium income data yet.</p>
        <p className="text-xs mt-1">Close some short option trades to see premium income analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Net Premium" value={fmt(totalNet)} color={totalNet >= 0 ? 'text-green-400' : 'text-red-400'}
          info="Gross premium collected minus what you paid to buy back options, minus all fees. This is your actual realised income from the wheel." />
        <StatCard label="Gross Collected" value={fmt(totalCollected)} color="text-slate-100"
          info="Sum of all opening credits received before buybacks or fees. Gross collected minus buybacks and fees = Net premium." />
        <StatCard label="Avg Monthly" value={fmt(avgMonthly)} color="text-blue-400"
          info="Net premium divided by the number of calendar months with at least one closed trade." />
        <StatCard label="Open Premium" value={fmt(openPremium)} color="text-amber-400" sub="unrealized"
          info="Total credit sitting in currently open (not yet closed) short option positions. You keep this if all open positions expire worthless." />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Premium by symbol */}
        {bySymbol.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Net Premium by Symbol</p>
            <ResponsiveContainer width="100%" height={Math.max(180, bySymbol.length * 32)}>
              <BarChart data={bySymbol} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="symbol" tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 600 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="premium" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {bySymbol.map((d, i) => <Cell key={i} fill={d.premium >= 0 ? '#4ade80' : '#f87171'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative premium */}
        {cumulative.length > 1 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Cumulative Premium</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumulative} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={d => d?.slice(5) || ''} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="premium" stroke="#4ade80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Monthly premium */}
      {monthly.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Monthly Premium Income</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{ left: 10, right: 10 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={m => m?.slice(5) || ''} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={l => l} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="premium" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {monthly.map((d, i) => <Cell key={i} fill={d.premium >= 0 ? '#4ade80' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ─── SUB-COMPONENT: Strike Calculator ────────────────────────────── */

/* ─── Options chain parser ─────────────────────────────────────────
   Format (tab-separated, from broker chain paste):
   Call Last | Call Delta | Call Bid | Call Ask | Call Vol | Call IV | STRIKE | Put IV | Put Vol | Put Bid | Put Ask | Put Delta | Put Last
   A "Last Price: XX.XX" line may appear anywhere in the data.
   ──────────────────────────────────────────────────────────────── */

function parseNum(v) {
  if (!v || v === '--' || v === '-') return null
  const n = parseFloat(v.replace('%', ''))
  return isNaN(n) ? null : n
}

function parseChain(raw) {
  const lines = raw.trim().split('\n')
  let lastPrice = null
  const rows = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect "Last Price: XX.XX"
    const priceMatch = trimmed.match(/Last\s*Price[:\s]+([0-9.]+)/i)
    if (priceMatch) {
      lastPrice = parseFloat(priceMatch[1])
      continue
    }

    const cols = trimmed.split('\t')
    if (cols.length < 13) continue

    const strike = parseNum(cols[6])
    if (strike === null) continue

    rows.push({
      call: {
        last:  parseNum(cols[0]),
        delta: parseNum(cols[1]),
        bid:   parseNum(cols[2]),
        ask:   parseNum(cols[3]),
        vol:   parseNum(cols[4]),
        iv:    parseNum(cols[5]),
      },
      strike,
      put: {
        iv:    parseNum(cols[7]),
        vol:   parseNum(cols[8]),
        bid:   parseNum(cols[9]),
        ask:   parseNum(cols[10]),
        delta: parseNum(cols[11]),
        last:  parseNum(cols[12]),
      },
    })
  }

  return { lastPrice, rows }
}

/* ─── Strike scoring for wheel ─────────────────────────────────────
   Scores OTM strikes on a 0-100 scale balancing:
   - Annualized return (reward)
   - Delta proximity to sweet spot (risk calibration)
   - Spread tightness (liquidity)
   Risk profiles: Aggressive (delta 0.35-0.50), Balanced (0.20-0.35), Conservative (0.10-0.20)
   ──────────────────────────────────────────────────────────────── */

function scoreStrikes(rows, isCSP, lastPrice, dte) {
  if (!lastPrice || !dte) return []

  const candidates = rows.filter(row => {
    const side  = isCSP ? row.put : row.call
    const delta = Math.abs(side.delta ?? 0)
    const mid   = side.bid != null && side.ask != null ? (side.bid + side.ask) / 2 : (side.last ?? 0)
    const isOTM = isCSP ? row.strike < lastPrice : row.strike > lastPrice
    return isOTM && delta > 0 && mid > 0
  })

  if (candidates.length === 0) return []

  const scored = candidates.map(row => {
    const side   = isCSP ? row.put : row.call
    const delta  = Math.abs(side.delta ?? 0)
    const mid    = side.bid != null && side.ask != null ? (side.bid + side.ask) / 2 : (side.last ?? 0)
    const spread = side.bid != null && side.ask != null && mid > 0 ? (side.ask - side.bid) / mid : 0.5
    const capital = isCSP ? row.strike * 100 : lastPrice * 100
    const annRet  = capital > 0 ? (mid * 100 / capital) * (365 / dte) * 100 : 0
    const otmPct  = Math.abs(row.strike - lastPrice) / lastPrice * 100
    const breakEven = isCSP ? row.strike - mid : row.strike + mid
    const bePct   = Math.abs(breakEven - lastPrice) / lastPrice * 100

    // Delta score: peak at 0.27 for balanced wheel, falls off either side
    const deltaPeak = 0.27
    const deltaScore = Math.max(0, 100 - Math.abs(delta - deltaPeak) * 300)

    // Return score: higher ann return is better but diminishing returns above 40%
    const retScore = Math.min(100, annRet * 2.5)

    // Liquidity score: penalise wide spread and zero volume
    const spreadScore = Math.max(0, 100 - spread * 200)
    const volScore    = side.vol ? Math.min(100, side.vol * 2) : 20

    // Composite (weights tuned for wheel context)
    const composite = retScore * 0.40 + deltaScore * 0.35 + spreadScore * 0.15 + volScore * 0.10

    // Risk profile
    let profile, profileColor
    if (delta >= 0.40)      { profile = 'Aggressive';   profileColor = 'text-red-400 bg-red-500/10 border-red-500/20' }
    else if (delta >= 0.28) { profile = 'Balanced';     profileColor = 'text-green-400 bg-green-500/10 border-green-500/20' }
    else if (delta >= 0.15) { profile = 'Conservative'; profileColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    else                    { profile = 'Far OTM';      profileColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20' }

    return { row, delta, mid, spread, annRet, otmPct, bePct, capital, composite, profile, profileColor, side }
  })

  return scored.sort((a, b) => b.composite - a.composite)
}

function StrikeCalculator() {
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [chainView, setChainView] = useState('analysis') // 'analysis' | 'chain'
  const [calc, setCalc] = useState({
    stockPrice: '',
    type: 'csp',
    strike: '',
    premium: '',
    contracts: '1',
    dte: '30',
  })

  function set(field, value) { setCalc(prev => ({ ...prev, [field]: value })) }

  const chain     = useMemo(() => pasteText ? parseChain(pasteText) : { lastPrice: null, rows: [] }, [pasteText])
  const price     = parseFloat(calc.stockPrice) || chain.lastPrice || 0
  const strike    = parseFloat(calc.strike) || 0
  const premium   = parseFloat(calc.premium) || 0
  const contracts = parseInt(calc.contracts) || 1
  const dte       = parseInt(calc.dte) || 30
  const isCSP     = calc.type === 'csp'

  const scored = useMemo(
    () => scoreStrikes(chain.rows, isCSP, chain.lastPrice || price, dte),
    [chain, isCSP, price, dte]
  )

  const totalPremium  = premium * contracts * 100
  const capitalNeeded = isCSP ? strike * contracts * 100 : price * contracts * 100
  const breakEven     = isCSP ? strike - premium : strike + premium
  const maxProfit     = totalPremium
  const annReturn     = capitalNeeded > 0 && dte > 0
    ? (totalPremium / capitalNeeded) * (365 / dte) * 100 : 0
  const premiumYield  = capitalNeeded > 0 ? (totalPremium / capitalNeeded) * 100 : 0
  const otmPercent    = price > 0 && strike > 0 ? Math.abs(strike - price) / price * 100 : 0

  function selectStrike(row) {
    const side = isCSP ? row.put : row.call
    const mid  = side.bid != null && side.ask != null ? ((side.bid + side.ask) / 2) : (side.last ?? 0)
    set('strike', String(row.strike))
    set('premium', String(Math.round(mid * 100) / 100))
    if (chain.lastPrice && !calc.stockPrice) set('stockPrice', String(chain.lastPrice))
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500'
  const labelCls = 'block text-xs text-slate-400 mb-1'

  return (
    <div className="space-y-5">
      {/* Chain card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">Options Chain</h3>
            {chain.lastPrice && <span className="text-xs text-slate-500">Last: <span className="text-slate-300 font-mono">${chain.lastPrice}</span></span>}
          </div>
          <div className="flex items-center gap-2">
            {chain.rows.length > 0 && (
              <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                <button onClick={() => setChainView('analysis')} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chainView === 'analysis' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>Analysis</button>
                <button onClick={() => setChainView('chain')}    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chainView === 'chain'    ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>Chain</button>
              </div>
            )}
            <button
              onClick={() => setShowPaste(!showPaste)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              {showPaste ? 'Hide' : chain.rows.length > 0 ? 'Edit' : 'Paste Chain'}
            </button>
          </div>
        </div>

        {showPaste && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">
              Paste your options chain from your broker (tab-separated). Calls on left, strike in middle, puts on right.
            </p>
            <textarea
              rows={6}
              className={`${inputCls} font-mono text-xs`}
              placeholder={'Call Last\tDelta\tBid\tAsk\tVol\tIV\tSTRIKE\tIV\tVol\tBid\tAsk\tDelta\tPut Last\n2.32\t0.611\t2.25\t3.00\t27\t58.12%\t50\t54.92%\t220\t1.15\t1.30\t-0.385\t1.15\nLast Price: 50.97'}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
            {pasteText && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">{chain.rows.length} strikes parsed</span>
                <button onClick={() => { setPasteText(''); set('strike', ''); set('premium', '') }} className="text-xs text-red-400 hover:text-red-300 ml-auto">Clear</button>
              </div>
            )}
          </div>
        )}

        {/* ── Analysis view ── */}
        {chain.rows.length > 0 && chainView === 'analysis' && (
          <div className="space-y-3">
            {/* Type toggle inside analysis so scoring is correct */}
            <div className="flex gap-2">
              <button onClick={() => set('type', 'csp')} className={`px-3 py-1.5 rounded text-xs font-medium ${isCSP ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>CSP</button>
              <button onClick={() => set('type', 'cc')}  className={`px-3 py-1.5 rounded text-xs font-medium ${!isCSP ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Covered Call</button>
              <span className="text-xs text-slate-500 self-center ml-2">DTE used for ann. return:</span>
              <input type="number" min="1" className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500" value={calc.dte} onChange={e => set('dte', e.target.value)} />
            </div>

            {scored.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No scoreable OTM strikes found. Make sure "Last Price" is in your pasted data.</p>
            ) : (
              <>
                {/* Top picks */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    Top Picks — {isCSP ? 'Cash-Secured Put' : 'Covered Call'}
                    <InfoTip>
                      <p className="font-semibold mb-1">How strikes are scored</p>
                      <p className="mb-1">Each OTM strike gets a 0–100 composite score:</p>
                      <ul className="space-y-1 mb-2">
                        <li><span className="text-blue-300">40%</span> — Annualized return (higher = better income)</li>
                        <li><span className="text-blue-300">35%</span> — Delta fit (sweet spot ~0.27 for balanced risk/reward)</li>
                        <li><span className="text-blue-300">15%</span> — Spread tightness (narrow bid-ask = easier fill)</li>
                        <li><span className="text-blue-300">10%</span> — Volume (more liquid = less slippage)</li>
                      </ul>
                      <p className="font-semibold mb-1">Risk profiles</p>
                      <ul className="space-y-1">
                        <li><span className="text-red-400">Aggressive</span> — δ ≥ 0.40. High premium, high assignment risk.</li>
                        <li><span className="text-green-400">Balanced</span> — δ 0.28–0.40. Classic wheel sweet spot.</li>
                        <li><span className="text-blue-400">Conservative</span> — δ 0.15–0.28. Safer, less income.</li>
                        <li><span className="text-slate-400">Far OTM</span> — δ &lt; 0.15. Very safe but minimal premium.</li>
                      </ul>
                    </InfoTip>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {scored.slice(0, 3).map((s, i) => {
                      const labels = ['Best Overall', 'Runner-up', 'Alternative']
                      return (
                        <button
                          key={s.row.strike}
                          onClick={() => selectStrike(s.row)}
                          className="text-left bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 rounded-xl p-3 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{labels[i]}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}>{s.profile}</span>
                          </div>
                          <div className="text-xl font-bold text-slate-100 font-mono">${s.row.strike.toFixed(s.row.strike % 1 ? 2 : 0)}</div>
                          <div className="mt-1 space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Mid premium</span>
                              <span className="text-green-400 font-mono">${s.mid.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Ann. return</span>
                              <span className="text-blue-400 font-mono">{s.annRet.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Delta</span>
                              <span className="text-slate-300 font-mono">{s.delta.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">% OTM</span>
                              <span className="text-slate-300 font-mono">{s.otmPct.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Break-even</span>
                              <span className="text-slate-300 font-mono">{s.bePct.toFixed(1)}% cushion</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-blue-400 group-hover:text-blue-300 mt-2">Click to load →</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Full ranked table */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">All OTM Strikes — Ranked</p>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-1.5 px-2 text-slate-500 font-medium">#</th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">Strike</th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            Mid <InfoTip>Midpoint of the bid and ask. This is the theoretical fair value of the option — in practice you'll likely get filled somewhere between mid and the bid when selling.</InfoTip>
                          </th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            Delta <InfoTip>Probability (roughly) that the option expires in-the-money. A put delta of 0.30 means ~30% chance of assignment. Lower delta = safer, less premium. Higher delta = more premium, more assignment risk.</InfoTip>
                          </th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            % OTM <InfoTip>How far the strike is from the current stock price as a percentage. Higher % OTM means more cushion before the option goes in-the-money.</InfoTip>
                          </th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            Ann. Return <InfoTip>Projected annualized return on the capital required. Formula: (mid premium / strike) × (365 / DTE) × 100. Assumes you repeat this trade every cycle — actual returns vary.</InfoTip>
                          </th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            BE Cushion <InfoTip>How far the stock can fall (CSP) or rise (CC) before you start losing money, expressed as a % of the current price. Larger cushion = more protection. Break-even = strike − premium for CSPs.</InfoTip>
                          </th>
                          <th className="text-right py-1.5 px-2 text-slate-500 font-medium">
                            IV <InfoTip>Implied Volatility — the market's expectation of future price movement embedded in the option price. Higher IV generally means higher premiums. Selling options in high IV environments is typically better for the wheel.</InfoTip>
                          </th>
                          <th className="text-left py-1.5 px-2 text-slate-500 font-medium">Profile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scored.map((s, i) => {
                          const iv = isCSP ? s.row.put.iv : s.row.call.iv
                          const isSelected = strike === s.row.strike
                          return (
                            <tr
                              key={s.row.strike}
                              onClick={() => selectStrike(s.row)}
                              className={`border-b border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/15' : i < 3 ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-slate-700/20'}`}
                            >
                              <td className="py-1.5 px-2 text-slate-500 font-medium">{i === 0 ? '★' : i + 1}</td>
                              <td className="py-1.5 px-2 text-right text-slate-200 font-mono font-semibold">${s.row.strike.toFixed(s.row.strike % 1 ? 2 : 0)}</td>
                              <td className="py-1.5 px-2 text-right text-green-400 font-mono">${s.mid.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-300 font-mono">{s.delta.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-400">{s.otmPct.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-blue-400 font-semibold">{s.annRet.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-slate-400">{s.bePct.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-slate-500">{iv != null ? iv.toFixed(1) + '%' : '--'}</td>
                              <td className="py-1.5 px-2">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}>{s.profile}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Score weights: 40% ann. return · 35% delta (sweet spot ~0.27) · 15% spread · 10% volume. Click any row to load it.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Raw chain view ── */}
        {chain.rows.length > 0 && chainView === 'chain' && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th colSpan={5} className="text-center py-1.5 text-amber-400 font-semibold text-[10px] uppercase tracking-wider">Calls</th>
                  <th className="py-1.5"></th>
                  <th colSpan={5} className="text-center py-1.5 text-purple-400 font-semibold text-[10px] uppercase tracking-wider">Puts</th>
                </tr>
                <tr className="border-b border-slate-700">
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Delta</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Bid</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Ask</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Vol</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">IV</th>
                  <th className="text-center py-1.5 px-2 text-slate-300 font-bold">Strike</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">IV</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Bid</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Ask</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Delta</th>
                  <th className="text-right py-1.5 px-1.5 text-slate-500 font-medium">Vol</th>
                </tr>
              </thead>
              <tbody>
                {chain.rows.map(row => {
                  const isATM = chain.lastPrice && Math.abs(row.strike - chain.lastPrice) ===
                    Math.min(...chain.rows.map(r => Math.abs(r.strike - chain.lastPrice)))
                  const isSelected = strike === row.strike
                  const putOTM = chain.lastPrice ? row.strike < chain.lastPrice : false
                  const callOTM = chain.lastPrice ? row.strike > chain.lastPrice : false
                  return (
                    <tr key={row.strike} onClick={() => selectStrike(row)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/15' : isATM ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}
                    >
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-amber-300'}`}>{row.call.delta?.toFixed(3) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.call.bid?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.call.ask?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${callOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.call.vol ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${callOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.call.iv != null ? row.call.iv.toFixed(1) + '%' : '--'}</td>
                      <td className={`py-1.5 px-2 text-center font-bold font-mono ${isATM ? 'text-blue-400' : 'text-slate-200'}`}>
                        {row.strike.toFixed(row.strike % 1 ? 2 : 0)}
                        {isATM && <span className="text-[9px] text-blue-500 ml-1">ATM</span>}
                      </td>
                      <td className={`py-1.5 px-1.5 text-right ${putOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.put.iv != null ? row.put.iv.toFixed(1) + '%' : '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.put.bid?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.put.ask?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? 'text-slate-500' : 'text-purple-300'}`}>{row.put.delta?.toFixed(3) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${putOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.put.vol ?? '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-[10px] text-slate-600 mt-2">Click a strike to select it. Premium auto-fills from the {isCSP ? 'put' : 'call'} mid price.</p>
          </div>
        )}
      </div>

      {/* Calculator */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Calculator</h3>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => set('type', 'csp')} className={`px-4 py-1.5 rounded text-sm font-medium ${isCSP ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            Cash-Secured Put
          </button>
          <button onClick={() => set('type', 'cc')} className={`px-4 py-1.5 rounded text-sm font-medium ${!isCSP ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            Covered Call
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div>
            <label className={labelCls}>Stock Price</label>
            <input type="number" step="0.01" className={inputCls} placeholder={chain.lastPrice ? String(chain.lastPrice) : '150.00'} value={calc.stockPrice} onChange={e => set('stockPrice', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Strike</label>
            <input type="number" step="0.01" className={inputCls} placeholder="145.00" value={calc.strike} onChange={e => set('strike', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Premium (per share)</label>
            <input type="number" step="0.01" className={inputCls} placeholder="2.50" value={calc.premium} onChange={e => set('premium', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contracts</label>
            <input type="number" min="1" className={inputCls} placeholder="1" value={calc.contracts} onChange={e => set('contracts', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>DTE (days)</label>
            <input type="number" min="1" className={inputCls} placeholder="30" value={calc.dte} onChange={e => set('dte', e.target.value)} />
          </div>
        </div>

        {/* Results */}
        {strike > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <ResultCard label="% OTM" value={`${otmPercent.toFixed(1)}%`} sub={price > 0 ? `$${Math.abs(strike - price).toFixed(2)} from price` : ''} />
            <ResultCard label="Break-Even" value={`$${breakEven.toFixed(2)}`} sub={`${isCSP ? '-' : '+'}$${premium.toFixed(2)} from strike`} />
            <ResultCard label="Max Profit" value={fmt(maxProfit)} color="text-green-400" />
            <ResultCard label="Capital Required" value={fmt(capitalNeeded)} />
            <ResultCard label="Premium Yield" value={`${premiumYield.toFixed(2)}%`} sub={`for ${dte} days`} />
            <ResultCard label="Annualized Return" value={`${annReturn.toFixed(1)}%`} color="text-blue-400" />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Shared mini-components ──────────────────────────────────────── */

function StatCard({ label, value, color = 'text-slate-100', sub, info }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
        {label} {info && <InfoTip>{info}</InfoTip>}
      </p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function ResultCard({ label, value, color = 'text-slate-100', sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  )
}

/* ─── Main Component ──────────────────────────────────────────────── */

export default function WheelTracker({ trades = [], investments = [] }) {
  const [subTab, setSubTab] = useState('positions')

  const positions = useMemo(() => buildWheelPositions(trades, investments), [trades, investments])

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {SUB_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {subTab === 'positions' && <WheelPositions positions={positions} />}
      {subTab === 'premium'   && <PremiumIncome positions={positions} />}
      {subTab === 'strikes'   && <StrikeCalculator />}
    </div>
  )
}
