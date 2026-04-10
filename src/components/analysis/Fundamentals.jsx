import { useState, useCallback, useEffect } from 'react'
import { fetchFundamentals, fetchPeers } from '../../utils/fetchFundamentals'
import { fmtInv } from '../../utils/investmentCalcs'
import { RefreshCw, ExternalLink, AlertTriangle, KeyRound, Search, X, Zap } from 'lucide-react'
import { KNOWN_ETFS, ETFCard } from './ETFCard'
import { getEarningsHistory } from '../../utils/valuationScore'

const fmt = (v, suffix = '', decimals = 2) =>
  v == null || isNaN(v) ? '—' : `${Number(v).toFixed(decimals)}${suffix}`

const fmtLarge = (v) => {
  if (v == null || isNaN(v)) return '—'
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toLocaleString()}`
}

function StatRow({ label, value, color = 'text-slate-200', sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="text-right">
        <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
        {sub && <span className="text-[10px] text-slate-600 ml-1.5">{sub}</span>}
      </div>
    </div>
  )
}

function Panel({ title, accent, children }) {
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 border-t-2 ${accent}`}>
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <div className="px-4 pb-3">{children}</div>
    </div>
  )
}

function AnalystBar({ strongBuy, buy, hold, sell, strongSell }) {
  const total = (strongBuy + buy + hold + sell + strongSell) || 1
  const bars = [
    { label: 'Strong Buy', count: strongBuy, color: '#10b981' },
    { label: 'Buy',        count: buy,       color: '#84cc16' },
    { label: 'Hold',       count: hold,      color: '#eab308' },
    { label: 'Sell',       count: sell,      color: '#f97316' },
    { label: 'Strong Sell',count: strongSell,color: '#ef4444' },
  ]
  return (
    <div className="space-y-1.5 mt-2">
      {bars.map(b => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-20 shrink-0">{b.label}</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(b.count / total) * 100}%`, background: b.color }} />
          </div>
          <span className="text-xs font-semibold text-slate-300 w-4 text-right">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

function PriceTargetBar({ current, low, mean, high }) {
  if (!current || !low || !high || low >= high) return null
  const clamp = v => Math.max(low, Math.min(high, v))
  const pct = v => ((clamp(v) - low) / (high - low)) * 100
  const upside = ((mean - current) / current) * 100

  return (
    <div className="mt-3">
      <div className="relative h-3 bg-slate-700 rounded-full mx-1 mb-5">
        {/* Range fill */}
        <div className="absolute h-full bg-blue-500/20 rounded-full" style={{ left: 0, width: '100%' }} />
        {/* Mean marker */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(mean)}%` }}>
          <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-slate-800" />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-blue-400 whitespace-nowrap">${mean?.toFixed(2)}</span>
        </div>
        {/* Current price marker */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(current)}%` }}>
          <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-slate-800" />
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-yellow-400 whitespace-nowrap">${current?.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>Low ${low?.toFixed(2)}</span>
        <span className={`font-semibold ${upside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% to mean target
        </span>
        <span>High ${high?.toFixed(2)}</span>
      </div>
    </div>
  )
}

function NewsItem({ item }) {
  const date = new Date(item.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group">
      {item.image && (
        <img src={item.image} alt="" className="w-14 h-14 rounded object-cover shrink-0 opacity-80" onError={e => e.target.style.display = 'none'} />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-200 line-clamp-2 group-hover:text-blue-400 transition-colors">{item.headline}</p>
        <p className="text-[10px] text-slate-500 mt-1">{item.source} · {date}</p>
      </div>
    </a>
  )
}

export default function Fundamentals({ investments, onSendToCompare }) {
  const open = investments.filter(i => i.status === 'open')
  const [selected, setSelected] = useState(open[0]?.symbol || '')
  const [data, setData] = useState({})      // symbol → fetched data
  const [peers, setPeers] = useState([])    // similar stocks
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [input, setInput] = useState('')
  const [extraSymbols, setExtraSymbols] = useState([])

  const apiKey = localStorage.getItem('bt_finnhub_key') || ''

  const load = useCallback(async (sym) => {
    if (!apiKey) { setError('no_key'); return }
    if (data[sym]) return   // already loaded
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFundamentals(sym, apiKey)
      setData(prev => ({ ...prev, [sym]: result }))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey, data])

  const reload = useCallback(async (sym) => {
    if (!apiKey) { setError('no_key'); return }
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFundamentals(sym, apiKey)
      setData(prev => ({ ...prev, [sym]: result }))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey])

  function select(sym) {
    setSelected(sym)
    setPeers([])
    if (!KNOWN_ETFS[sym]) load(sym)
  }

  // Auto-load first symbol (skip for known ETFs/indexes)
  if (selected && !data[selected] && !loading && apiKey && error !== 'no_key' && !KNOWN_ETFS[selected]) {
    load(selected)
  }

  // Fetch peers when symbol changes
  useEffect(() => {
    if (!selected || !apiKey || KNOWN_ETFS[selected]) return
    fetchPeers(selected, apiKey).then(setPeers).catch(() => setPeers([]))
  }, [selected, apiKey])

  if (!apiKey || error === 'no_key') {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center space-y-3">
        <KeyRound size={28} className="text-slate-500 mx-auto" />
        <p className="text-slate-300 font-medium">Finnhub API Key Required</p>
        <p className="text-sm text-slate-500">Enter your free Finnhub API key using the key icon in the header (Investments tab) to load company fundamentals.</p>
        <p className="text-xs text-slate-600">Free at finnhub.io — takes 30 seconds to register.</p>
      </div>
    )
  }

  const d = data[selected]
  const inv = open.find(i => i.symbol === selected) ?? null

  return (
    <div className="space-y-4">
      {/* Symbol selector row */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={e => {
          e.preventDefault()
          const sym = input.trim().toUpperCase()
          if (!sym) return
          if (!open.find(i => i.symbol === sym) && !extraSymbols.includes(sym))
            setExtraSymbols(prev => [...prev, sym])
          select(sym)
          setInput('')
        }} className="flex gap-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="Search ticker…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono w-32"
            />
          </div>
          <button type="submit" disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            Go
          </button>
        </form>

        {open.map(i => (
          <button key={i.symbol}
            onClick={() => select(i.symbol)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              selected === i.symbol
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}>
            {i.symbol}
          </button>
        ))}

        {extraSymbols.map(sym => (
          <div key={sym} className={`flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
            selected === sym
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
          }`}>
            <button onClick={() => select(sym)}>{sym}</button>
            <button onClick={() => {
              setExtraSymbols(prev => prev.filter(s => s !== sym))
              if (selected === sym) select(open[0]?.symbol || extraSymbols.find(s => s !== sym) || '')
            }} className="ml-0.5 opacity-50 hover:opacity-100">
              <X size={11} />
            </button>
          </div>
        ))}

        {selected && (
          <button onClick={() => reload(selected)} disabled={loading}
            className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        )}
      </div>

      {error && error !== 'no_key' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {loading && !d && (
        <div className="text-center text-slate-500 py-16 text-sm animate-pulse">Loading data for {selected}…</div>
      )}

      {!loading && selected && KNOWN_ETFS[selected] && (
        <ETFCard sym={selected} />
      )}

      {d && !KNOWN_ETFS[selected] && (
        <>
          {/* Company header */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-start gap-4">
            {d.profile?.logo && (
              <img src={d.profile.logo} alt="" className="w-12 h-12 rounded-lg object-contain bg-white p-1 shrink-0" onError={e => e.target.style.display = 'none'} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{d.profile?.name || selected}</h2>
                  <p className="text-xs text-slate-500">{d.profile?.exchange} · {d.profile?.finnhubIndustry}</p>
                </div>
                {d.profile?.weburl && (
                  <a href={d.profile.weburl} target="_blank" rel="noopener noreferrer"
                    className="text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {/* Quick price bar */}
              {d.quote && (
                <div className="flex flex-wrap gap-4 mt-2">
                  <div>
                    <span className="text-lg font-bold text-slate-100 tabular-nums">${d.quote.c?.toFixed(2)}</span>
                    <span className={`ml-2 text-sm font-semibold ${d.quote.dp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {d.quote.dp >= 0 ? '+' : ''}{d.quote.dp?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-x-3">
                    <span>H ${d.quote.h?.toFixed(2)}</span>
                    <span>L ${d.quote.l?.toFixed(2)}</span>
                    <span>Prev ${d.quote.pc?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Your position summary */}
          {inv && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Your Shares', value: parseFloat(inv.shares).toLocaleString() },
                { label: 'Avg Cost', value: `$${parseFloat(inv.avgCost).toFixed(2)}` },
                { label: 'Mkt Value', value: fmtInv((parseFloat(inv.shares) || 0) * (d.quote?.c || parseFloat(inv.currentPrice) || 0)) },
                { label: 'Unrealized P&L', value: fmtInv((d.quote?.c - parseFloat(inv.avgCost)) * parseFloat(inv.shares)),
                  color: d.quote?.c >= parseFloat(inv.avgCost) ? 'text-green-400' : 'text-red-400' },
              ].map(({ label, value, color = 'text-slate-200' }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Similar stocks / peers */}
          {peers.length > 0 && (() => {
            const allSymbols = new Set([...open.map(i => i.symbol), ...extraSymbols, selected])
            const uniquePeers = peers.filter(p => !allSymbols.has(p))
            return uniquePeers.length > 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] p-4 border-t-2 border-t-purple-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Similar Stocks (Peers)</p>
                  {onSendToCompare && (
                    <button
                      onClick={() => {
                        const toSend = [selected, ...uniquePeers]
                        const unique = [...new Set(toSend)]
                        onSendToCompare(unique)
                      }}
                      className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors">
                      <Zap size={12} />
                      Compare All
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniquePeers.slice(0, 8).map(sym => (
                    <button
                      key={sym}
                      onClick={() => select(sym)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 px-2.5 py-1.5 rounded-lg transition-colors">
                      {sym}
                    </button>
                  ))}
                  {uniquePeers.length > 8 && (
                    <div className="text-xs text-slate-500 px-2.5 py-1.5">
                      +{uniquePeers.length - 8} more
                    </div>
                  )}
                </div>
              </div>
            ) : null
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Valuation */}
            <Panel title="Valuation" accent="border-t-blue-500">
              <StatRow label="Market Cap"       value={fmtLarge(d.profile?.marketCapitalization * 1e6)} />
              <StatRow label="P/E Ratio"        value={fmt(d.metrics?.peBasicExclExtraTTM)}
                color={d.metrics?.peBasicExclExtraTTM > 30 ? 'text-yellow-400' : d.metrics?.peBasicExclExtraTTM < 15 ? 'text-green-400' : 'text-slate-200'} />
              <StatRow label="Forward P/E"      value={fmt(d.metrics?.peTTM)} />
              <StatRow label="P/S Ratio"        value={fmt(d.metrics?.psTTM)} />
              <StatRow label="P/B Ratio"        value={fmt(d.metrics?.pbQuarterly)} />
              <StatRow label="EV/EBITDA"        value={fmt(d.metrics?.evEbitdaTTM)} />
              <StatRow label="EPS (TTM)"        value={d.metrics?.epsTTM != null ? `$${fmt(d.metrics.epsTTM)}` : '—'} />
              <StatRow label="Div. Yield"       value={fmt(d.metrics?.dividendYieldIndicatedAnnual, '%')}
                color={d.metrics?.dividendYieldIndicatedAnnual > 0 ? 'text-green-400' : 'text-slate-500'} />
            </Panel>

            {/* Growth & Profitability */}
            <Panel title="Growth & Profitability" accent="border-t-emerald-500">
              <StatRow label="Revenue / Share"  value={d.metrics?.revenuePerShareTTM != null ? `$${fmt(d.metrics.revenuePerShareTTM)}` : '—'} />
              <StatRow label="ROE"              value={fmt(d.metrics?.roeTTM, '%')}
                color={d.metrics?.roeTTM > 15 ? 'text-green-400' : d.metrics?.roeTTM < 0 ? 'text-red-400' : 'text-slate-200'} />
              <StatRow label="ROA"              value={fmt(d.metrics?.roaTTM, '%')}
                color={d.metrics?.roaTTM > 5 ? 'text-green-400' : d.metrics?.roaTTM < 0 ? 'text-red-400' : 'text-slate-200'} />
              <StatRow label="Net Margin"       value={fmt(d.metrics?.netProfitMarginTTM, '%')}
                color={d.metrics?.netProfitMarginTTM > 10 ? 'text-green-400' : d.metrics?.netProfitMarginTTM < 0 ? 'text-red-400' : 'text-slate-200'} />
              <StatRow label="Gross Margin"     value={fmt(d.metrics?.grossMarginTTM, '%')} />
              <StatRow label="Rev Growth (YoY)" value={fmt(d.metrics?.revenueGrowthTTMYoy, '%')}
                color={d.metrics?.revenueGrowthTTMYoy > 0 ? 'text-green-400' : 'text-red-400'} />
              <StatRow label="EPS Growth (YoY)" value={fmt(d.metrics?.epsGrowthTTMYoy, '%')}
                color={d.metrics?.epsGrowthTTMYoy > 0 ? 'text-green-400' : 'text-red-400'} />
            </Panel>

            {/* Risk */}
            <Panel title="Risk & Price Range" accent="border-t-yellow-500">
              <StatRow label="Beta"             value={fmt(d.metrics?.beta)}
                color={d.metrics?.beta > 1.5 ? 'text-red-400' : d.metrics?.beta < 0.8 ? 'text-blue-400' : 'text-slate-200'} />
              <StatRow label="Debt / Equity"    value={fmt(d.metrics?.totalDebt_totalEquityQuarterly)}
                color={d.metrics?.totalDebt_totalEquityQuarterly > 2 ? 'text-red-400' : 'text-slate-200'} />
              <StatRow label="Current Ratio"    value={fmt(d.metrics?.currentRatioQuarterly)}
                color={d.metrics?.currentRatioQuarterly > 1.5 ? 'text-green-400' : d.metrics?.currentRatioQuarterly < 1 ? 'text-red-400' : 'text-yellow-400'} />
              <StatRow label="52W High"         value={d.metrics?.['52WeekHigh'] != null ? `$${fmt(d.metrics['52WeekHigh'])}` : '—'} />
              <StatRow label="52W Low"          value={d.metrics?.['52WeekLow'] != null ? `$${fmt(d.metrics['52WeekLow'])}` : '—'} />
              <StatRow label="52W Return"       value={fmt(d.metrics?.['52WeekPriceReturnDaily'], '%')}
                color={d.metrics?.['52WeekPriceReturnDaily'] > 0 ? 'text-green-400' : 'text-red-400'} />
              <StatRow label="Shares Out."      value={d.metrics?.sharesOutstanding != null ? `${(d.metrics.sharesOutstanding / 1e6).toFixed(1)}M` : '—'} />
            </Panel>

            {/* Analyst ratings */}
            {d.recs && (
              <Panel title="Analyst Recommendations" accent="border-t-violet-500">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Period</span>
                  <span className="text-xs font-semibold text-slate-300">{d.recs.period}</span>
                </div>
                <AnalystBar
                  strongBuy={d.recs.strongBuy} buy={d.recs.buy}
                  hold={d.recs.hold} sell={d.recs.sell} strongSell={d.recs.strongSell}
                />
                <div className="flex justify-between text-xs mt-3 pt-2 border-t border-slate-700">
                  <span className="text-slate-500">Total analysts</span>
                  <span className="font-semibold text-slate-300">
                    {d.recs.strongBuy + d.recs.buy + d.recs.hold + d.recs.sell + d.recs.strongSell}
                  </span>
                </div>
              </Panel>
            )}

            {/* Price target */}
            {d.targets && d.targets.targetMean && (
              <Panel title="Analyst Price Target" accent="border-t-cyan-500">
                <PriceTargetBar
                  current={d.quote?.c}
                  low={d.targets.targetLow}
                  mean={d.targets.targetMean}
                  high={d.targets.targetHigh}
                />
                <div className="mt-4 space-y-0">
                  <StatRow label="Target Low"  value={`$${fmt(d.targets.targetLow)}`} />
                  <StatRow label="Target Mean" value={`$${fmt(d.targets.targetMean)}`} color="text-blue-400" />
                  <StatRow label="Target High" value={`$${fmt(d.targets.targetHigh)}`} />
                  <StatRow label="Analyst Count" value={d.targets.targetNumberOfAnalysts ?? '—'} />
                </div>
              </Panel>
            )}
          </div>

          {/* Earnings History */}
          {(() => {
            const history = getEarningsHistory(d.earnings)
            return history.length > 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] p-5 border-t-2 border-t-cyan-500">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-4">Earnings History</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-2 text-slate-400 font-semibold">Quarter</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-semibold">Actual EPS</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-semibold">Estimated</th>
                        <th className="text-right py-2 px-2 text-slate-400 font-semibold">Surprise</th>
                        <th className="text-left py-2 px-2 text-slate-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="py-2 px-2 font-medium text-slate-300">{e.quarter}</td>
                          <td className="py-2 px-2 text-right text-slate-200 font-semibold">${e.actual}</td>
                          <td className="py-2 px-2 text-right text-slate-500">${e.estimate}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${e.surprise == null ? 'text-slate-500' : e.surprise >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {e.surprise != null ? `${e.surprise >= 0 ? '+' : ''}${e.surprise}%` : '—'}
                          </td>
                          <td className="py-2 px-2 text-slate-500 text-[9px]">{e.period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
          })()}

          {/* News */}
          {d.news?.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recent News (30 days)</p>
              <div className="divide-y divide-slate-700/50">
                {d.news.map((item, i) => <NewsItem key={i} item={item} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
