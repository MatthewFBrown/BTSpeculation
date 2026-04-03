import { useState, useCallback, useEffect } from 'react'
import { fetchFinancials } from '../../utils/fetchFinancials'
import { MOCK_FINANCIALS } from '../../utils/mockFinancials'
import { RefreshCw, AlertTriangle, KeyRound, Search, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ── Formatters ────────────────────────────────────────────────
const fmtB = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs  = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}
const fmt2 = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toFixed(2)}`

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const periodLabel = (r) => {
  const [year, month] = r.date.split('-')
  return r.isAnnual
    ? year
    : `${MONTHS[parseInt(month) - 1]} '${year.slice(-2)}`
}

const valColor = (v) =>
  v == null ? 'text-slate-500' : v < 0 ? 'text-red-400' : 'text-slate-200'

// ── Section definitions ───────────────────────────────────────
const SECTIONS = [
  {
    id: 'income', label: 'Income Statement',
    chartBars: [
      { key: 'revenue',         label: 'Revenue',      color: '#3b82f6' },
      { key: 'grossProfit',     label: 'Gross Profit', color: '#10b981' },
      { key: 'netIncome',       label: 'Net Income',   color: '#8b5cf6' },
    ],
    rows: [
      { key: 'revenue',         label: 'Revenue' },
      { key: 'cogs',            label: 'Cost of Revenue' },
      { key: 'grossProfit',     label: 'Gross Profit' },
      { key: 'rd',              label: 'R&D Expense' },
      { key: 'sga',             label: 'SG&A Expense' },
      { key: 'operatingIncome', label: 'Operating Income' },
      { key: 'netIncome',       label: 'Net Income' },
      { key: 'epsBasic',        label: 'EPS (Basic)',    fmt: fmt2 },
      { key: 'epsDiluted',      label: 'EPS (Diluted)', fmt: fmt2 },
    ],
  },
  {
    id: 'balance', label: 'Balance Sheet',
    chartBars: [
      { key: 'totalAssets',      label: 'Total Assets',      color: '#3b82f6' },
      { key: 'totalLiabilities', label: 'Total Liabilities', color: '#ef4444' },
      { key: 'equity',           label: 'Equity',            color: '#10b981' },
    ],
    rows: [
      { key: 'cash',               label: 'Cash & Equivalents' },
      { key: 'currentAssets',      label: 'Current Assets' },
      { key: 'totalAssets',        label: 'Total Assets' },
      { key: 'currentLiabilities', label: 'Current Liabilities' },
      { key: 'longTermDebt',       label: 'Long-term Debt' },
      { key: 'totalLiabilities',   label: 'Total Liabilities' },
      { key: 'equity',             label: "Stockholders' Equity" },
      { key: 'retainedEarnings',   label: 'Retained Earnings' },
    ],
  },
  {
    id: 'cashflow', label: 'Cash Flow',
    chartBars: [
      { key: 'operatingCF', label: 'Operating CF', color: '#10b981' },
      { key: 'freeCF',      label: 'Free CF',      color: '#3b82f6' },
      { key: 'investingCF', label: 'Investing CF', color: '#f97316' },
    ],
    rows: [
      { key: 'operatingCF',  label: 'Operating Cash Flow' },
      { key: 'capex',        label: 'Capital Expenditures' },
      { key: 'freeCF',       label: 'Free Cash Flow' },
      { key: 'depreciation', label: 'Depreciation & Amort.' },
      { key: 'stockComp',    label: 'Stock-Based Comp.' },
      { key: 'investingCF',  label: 'Investing Cash Flow' },
      { key: 'financingCF',  label: 'Financing Cash Flow' },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────
function FinChart({ data, bars }) {
  const chartData = [...data].reverse().map(r => ({
    label: periodLabel(r),
    ...Object.fromEntries(bars.map(b => [b.key, r[b.key]])),
  }))

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barGap={2} barCategoryGap="22%">
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtB} tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false} tickLine={false} width={62} />
        <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8', marginBottom: 4, fontSize: 11 }}
          formatter={(v, name) => [fmtB(v), name]}
          itemStyle={{ color: '#e2e8f0' }}
        />
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label}
            fill={b.color} fillOpacity={0.85} radius={[2, 2, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function pctChange(current, prior) {
  if (current == null || prior == null || prior === 0) return null
  return ((current - prior) / Math.abs(prior)) * 100
}

function ChangeBadge({ pct }) {
  if (pct == null) return null
  const pos = pct >= 0
  return (
    <span className={`ml-1 text-[9px] font-bold tabular-nums ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function FinTable({ data, rows }) {
  // Most recent first for the table
  const reversed = [...data].reverse()

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-500 font-semibold sticky left-0 bg-slate-800 w-44 z-10">
              Metric
            </th>
            {reversed.map(r => (
              <th key={r.date} className="px-3 py-2 text-right text-slate-400 font-semibold tabular-nums whitespace-nowrap">
                {periodLabel(r)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className="border-b border-slate-700/40 hover:bg-slate-700/20">
              <td className="px-3 py-2.5 text-slate-400 font-medium sticky left-0 bg-slate-800 z-10">
                {row.label}
              </td>
              {reversed.map((r, i) => {
                const v     = r[row.key]
                const prior = reversed[i + 1]?.[row.key]   // next col = older period
                const pct   = row.fmt ? null : pctChange(v, prior)
                const display = row.fmt ? (v != null ? row.fmt(v) : '—') : fmtB(v)
                return (
                  <td key={r.date} className={`px-3 py-2.5 text-right tabular-nums font-semibold ${valColor(v)}`}>
                    {v == null
                      ? <span className="text-slate-600">—</span>
                      : <>{display}<ChangeBadge pct={pct} /></>
                    }
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Financials({ investments, preloadSymbol }) {
  const open = investments.filter(i => i.status === 'open')
  const [selected, setSelected]     = useState(preloadSymbol || open[0]?.symbol || '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [freq, setFreq]             = useState('annual')
  const [section, setSection]       = useState('income')
  const [input, setInput]           = useState('')
  const [extraSymbols, setExtraSymbols] = useState([])

  const apiKey = localStorage.getItem('bt_av_key') || ''

  // Persist fetched data in localStorage so page refreshes don't cost API calls
  const CACHE_KEY = 'bt_financials_cache'
  const TS_KEY    = 'bt_financials_ts'
  const [cache, setCache] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      // Pre-seed MSFT mock data so the tab is usable without an API key
      if (!stored['MSFT']) stored['MSFT'] = MOCK_FINANCIALS
      return stored
    } catch { return { MSFT: MOCK_FINANCIALS } }
  })
  const [timestamps, setTimestamps] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TS_KEY) || '{}') } catch { return {} }
  })

  function updateCache(sym, result) {
    const next = { ...cache, [sym]: result }
    setCache(next)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch {}
    const ts = { ...timestamps, [sym]: Date.now() }
    setTimestamps(ts)
    try { localStorage.setItem(TS_KEY, JSON.stringify(ts)) } catch {}
  }

  function fmtAge(sym) {
    const ts = timestamps[sym]
    if (!ts) return null
    const mins = Math.floor((Date.now() - ts) / 60000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const load = useCallback(async (sym) => {
    if (!apiKey) { setError('no_key'); return }
    if (cache[sym]) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinancials(sym, apiKey)
      updateCache(sym, result)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey, cache])  // eslint-disable-line

  const reload = useCallback(async (sym) => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinancials(sym, apiKey)
      updateCache(sym, result)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey])  // eslint-disable-line

  function select(sym) { setSelected(sym) }

  // When a ticker tape click arrives, switch to that symbol
  useEffect(() => {
    if (preloadSymbol) setSelected(preloadSymbol)
  }, [preloadSymbol])


  if (!apiKey || error === 'no_key') {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center space-y-3">
        <KeyRound size={28} className="text-slate-500 mx-auto" />
        <p className="text-slate-300 font-medium">Alpha Vantage API Key Required</p>
        <p className="text-sm text-slate-500">
          Enter your free Alpha Vantage key using the key icon in the header.
          Get one free at <span className="text-blue-400">alphavantage.co</span> — 25 requests/day.
        </p>
      </div>
    )
  }

  const d       = cache[selected]
  const periods = d ? (freq === 'annual' ? d.annual : d.quarterly) : []
  const sec     = SECTIONS.find(s => s.id === section)

  return (
    <div className="space-y-4">
      {/* Search + symbol selector */}
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
          <button key={i.symbol} onClick={() => select(i.symbol)}
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
          <div className="ml-auto flex items-center gap-2">
            {fmtAge(selected) && (
              <span className="text-[10px] text-slate-600">fetched {fmtAge(selected)}</span>
            )}
            <button onClick={() => reload(selected)} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {loading && !d && (
        <div className="text-center py-16 text-slate-500 text-sm animate-pulse">
          Loading financials for {selected}…
        </div>
      )}

      {!loading && selected && !d && (
        <div className="text-center py-16 space-y-3">
          <p className="text-slate-500 text-sm">No data loaded for <span className="font-mono text-slate-300">{selected}</span>.</p>
          <button onClick={() => reload(selected)}
            className="flex items-center gap-1.5 mx-auto text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 px-4 py-2 rounded-lg">
            <RefreshCw size={12} /> Load Financials
          </button>
        </div>
      )}

      {d && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
              {[['annual', 'Annual'], ['quarterly', 'Quarterly']].map(([val, label]) => (
                <button key={val} onClick={() => setFreq(val)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    freq === val ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    section === s.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {sec && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{sec.label}</p>
                {selected === 'MSFT' && !apiKey
                  ? <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-semibold">Demo Data</span>
                  : <p className="text-[10px] text-slate-600">Alpha Vantage · 3 calls/symbol</p>
                }
              </div>

              {periods.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-slate-400 text-sm">No {freq} data available for {selected}.</p>
                  <p className="text-slate-600 text-xs">
                    Alpha Vantage may not have financial statement data for ETFs or crypto.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {sec.chartBars.map(b => (
                      <div key={b.key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
                        <span className="text-xs text-slate-400">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <FinChart data={periods} bars={sec.chartBars} />
                  <FinTable data={periods} rows={sec.rows} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
