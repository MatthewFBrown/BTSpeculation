import { useState, useEffect, useMemo } from 'react'
import { findOptimalSubset, findOptimalSubsetForSymbols, getAssetParams, setComputedParams, setRealCorrelations } from '../../utils/efficientFrontier'
import { fetchCorrelations } from '../../utils/fetchCorrelations'
import { Play, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, X, ChevronDown, ChevronUp, RotateCcw, RefreshCw } from 'lucide-react'

const fmt2 = v => v == null ? '—' : v.toFixed(2)
const fmtPct = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

const COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500']

function PriceInput({ value, onChange }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const hasValue = value != null && value > 0
  return (
    <div className="inline-flex items-center gap-1 justify-end">
      <span className="text-slate-500 text-xs">$</span>
      <input
        type="text"
        value={focused ? raw : hasValue ? value.toFixed(2) : ''}
        onChange={e => setRaw(e.target.value)}
        onFocus={() => { setRaw(hasValue ? value.toFixed(2) : ''); setFocused(true) }}
        onBlur={() => {
          setFocused(false)
          const n = parseFloat(raw)
          if (!isNaN(n) && n > 0) onChange(n)
        }}
        placeholder="—"
        className="w-20 text-right bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs tabular-nums focus:outline-none focus:border-blue-500 text-slate-200 placeholder:text-slate-600"
      />
    </div>
  )
}

function ParamInput({ value, defaultValue, onChange }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const changed = Math.abs(value - defaultValue) > 0.01
  return (
    <div className="inline-flex items-center gap-1 justify-end">
      <input
        type="text"
        value={focused ? raw : value.toFixed(1)}
        onChange={e => setRaw(e.target.value)}
        onFocus={() => { setRaw(value.toFixed(1)); setFocused(true) }}
        onBlur={() => {
          setFocused(false)
          const n = parseFloat(raw)
          if (!isNaN(n) && n > 0) onChange(n)
        }}
        className={`w-16 text-right bg-slate-700 border rounded px-2 py-1 text-xs tabular-nums focus:outline-none focus:border-blue-500 ${
          changed ? 'border-blue-500 text-blue-300' : 'border-slate-600 text-slate-200'
        }`}
      />
      <span className="text-slate-500 text-xs">%</span>
    </div>
  )
}

export default function PortfolioOptimizer({ investments, corrVersion, incomingSymbols = null, onClearIncoming }) {
  const [running, setRunning]               = useState(false)
  const [result, setResult]                 = useState(null)
  const [ranWith, setRanWith]               = useState(null)
  const [customSymbols, setCustomSymbols]   = useState(null)
  const [paramsOverride, setParamsOverride] = useState({})
  const [priceOverride, setPriceOverride]   = useState({})
  const [showParams, setShowParams]         = useState(false)
  const [fetching, setFetching]             = useState(false)
  const [localCorrV, setLocalCorrV]         = useState(0)
  const [nSim, setNSim]                     = useState(6000)
  const [customInvestAmount, setCustomInvestAmount] = useState('')
  const [fetchingPrices, setFetchingPrices] = useState(false)
  const [priceErrors, setPriceErrors]       = useState([])

  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)

  // When sector browser sends symbols, load them in and clear the result
  useEffect(() => {
    if (incomingSymbols && incomingSymbols.length >= 2) {
      setCustomSymbols(incomingSymbols)
      setResult(null)
      setParamsOverride({})
      setPriceOverride({})
    }
  }, [incomingSymbols])

  // Seed prices from portfolio positions
  useEffect(() => {
    const seeds = {}
    for (const inv of open) {
      const price = parseFloat(inv.currentPrice) || parseFloat(inv.avgCost) || 0
      if (price > 0) seeds[inv.symbol] = price
    }
    setPriceOverride(prev => ({ ...seeds, ...prev }))
  }, [open.map(i => i.symbol).join(',')])

  const mode = customSymbols ? 'custom' : 'portfolio'
  const symbols = customSymbols || open.map(i => i.symbol)

  // Fetch historical return/vol data for the current symbol set
  useEffect(() => {
    if (symbols.length < 2) return
    setFetching(true)
    fetchCorrelations(symbols).then(({ corrMap, paramsMap }) => {
      if (Object.keys(paramsMap).length > 0) {
        setRealCorrelations(corrMap)
        setComputedParams(paramsMap)
        setLocalCorrV(v => v + 1)
      }
      setFetching(false)
    }).catch(() => setFetching(false))
  }, [symbols.join(',')])  // eslint-disable-line

  // Default params for each symbol — re-derived when historical data arrives
  const defaultParams = useMemo(() =>
    Object.fromEntries(symbols.map(s => [s, getAssetParams(s)])),
  [symbols.join(','), localCorrV, corrVersion])  // eslint-disable-line

  // Portfolio value and per-symbol lookup for shares/price calculations
  const portfolioMap = useMemo(() => {
    const map = {}
    for (const inv of open) {
      const price = parseFloat(inv.currentPrice) || parseFloat(inv.avgCost) || 0
      const shares = parseFloat(inv.shares) || 0
      map[inv.symbol] = { price, shares, value: price * shares }
    }
    return map
  }, [open.map(i => i.symbol).join(',')])  // eslint-disable-line

  const portfolioTotalValue = useMemo(
    () => Object.values(portfolioMap).reduce((s, v) => s + v.value, 0),
    [portfolioMap]
  )
  const totalInvestValue = mode === 'custom'
    ? (parseFloat(customInvestAmount.replace(/,/g, '')) || 0)
    : portfolioTotalValue

  function setOverride(sym, field, val) {
    setParamsOverride(prev => ({
      ...prev,
      [sym]: { ...(prev[sym] || {}), [field]: val },
    }))
  }

  function resetOverrides() { setParamsOverride({}) }

  async function fetchPricesFromFinnhub() {
    const apiKey = localStorage.getItem('bt_finnhub_key') || ''
    if (!apiKey) {
      setPriceErrors(['No Finnhub API key set — add it via the refresh button on the main page.'])
      return
    }
    setFetchingPrices(true)
    setPriceErrors([])
    const errors = []
    for (const sym of symbols) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!data.c || data.c === 0) throw new Error('no price returned')
        setPriceOverride(prev => ({ ...prev, [sym]: data.c }))
      } catch (e) {
        errors.push(`${sym}: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 150))
    }
    setPriceErrors(errors)
    setFetchingPrices(false)
  }

  async function run() {
    setRunning(true)
    setResult(null)
    await new Promise(r => setTimeout(r, 40))
    const r = mode === 'custom'
      ? findOptimalSubsetForSymbols(customSymbols, paramsOverride, nSim)
      : findOptimalSubset(investments, paramsOverride, nSim)
    setResult(r)
    setRanWith(corrVersion)
    setRunning(false)
  }

  function clearCustom() {
    setCustomSymbols(null)
    setResult(null)
    onClearIncoming?.()
  }

  const staleCorr = result && ranWith !== corrVersion

  if (mode === 'portfolio' && open.length < 2) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-500 text-sm">
        Need at least 2 open positions to run the optimizer.
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header card */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-200">Subset Optimizer</p>
            {customSymbols && (
              <div className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 rounded-full px-2.5 py-0.5">
                <span className="text-[10px] text-violet-300 font-semibold">From Sector Browser:</span>
                <span className="text-[10px] text-violet-200 font-mono">{customSymbols.join(', ')}</span>
                <button onClick={clearCustom} className="text-violet-400 hover:text-violet-200 ml-0.5">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {customSymbols
              ? `Running on ${customSymbols.length} stocks from the sector browser. Hit × to switch back to your portfolio positions.`
              : `Uses backward elimination to find which combination of your ${open.length} holdings produces the highest Sharpe ratio.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
            {[
              { label: 'Fast',     n: 3000  },
              { label: 'Standard', n: 6000  },
              { label: 'High',     n: 15000 },
              { label: 'Max',      n: 40000 },
            ].map(({ label, n }) => (
              <button key={n} onClick={() => setNSim(n)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  nSim === n ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-400 shrink-0">Total to invest</span>
              <span className="text-slate-500 text-sm">$</span>
              <input
                type="text"
                value={customInvestAmount}
                onChange={e => setCustomInvestAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="w-28 bg-transparent text-sm text-slate-100 tabular-nums focus:outline-none placeholder:text-slate-600"
              />
            </div>
          )}
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
          >
            <Play size={14} className={running ? 'animate-pulse' : ''} />
            {running ? 'Optimizing…' : result ? 'Re-run' : 'Run Optimizer'}
          </button>
        </div>
      </div>

      {/* Assumptions editor */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowParams(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assumptions</span>
            {Object.keys(paramsOverride).length > 0 && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-semibold">
                {Object.keys(paramsOverride).length} overridden
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(paramsOverride).length > 0 && (
              <button onClick={e => { e.stopPropagation(); resetOverrides() }}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                <RotateCcw size={10} /> Reset
              </button>
            )}
            {showParams ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
          </div>
        </button>

        {showParams && (
          <div className="border-t border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-2 text-left text-slate-500 font-semibold">Symbol</th>
                  <th className="px-4 py-2 text-right text-slate-500 font-semibold">Expected Return %
                    <span className="block text-[9px] font-normal text-slate-600">annual</span>
                  </th>
                  <th className="px-4 py-2 text-right text-slate-500 font-semibold">Volatility %
                    <span className="block text-[9px] font-normal text-slate-600">annual std dev</span>
                  </th>
                  <th className="px-4 py-2 text-right text-slate-500 font-semibold">
                    <div className="flex items-center justify-end gap-2">
                      <span>Price $</span>
                      <button
                        onClick={fetchPricesFromFinnhub}
                        disabled={fetchingPrices}
                        title="Fetch live prices from Finnhub"
                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50 font-normal transition-colors bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-1.5 py-0.5 rounded"
                      >
                        <RefreshCw size={9} className={fetchingPrices ? 'animate-spin' : ''} />
                        {fetchingPrices ? 'Fetching…' : 'Fetch'}
                      </button>
                    </div>
                    <span className="block text-[9px] font-normal text-slate-600">current</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {symbols.map(sym => {
                  const base = defaultParams[sym] || { r: 0.12, s: 0.28 }
                  const over = paramsOverride[sym] || {}
                  const effR = over.r ?? base.r
                  const effS = over.s ?? base.s
                  const changed = over.r != null || over.s != null
                  return (
                    <tr key={sym} className={`border-b border-slate-700/40 ${changed ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-200">{sym}</td>
                      <td className="px-4 py-2 text-right">
                        <ParamInput
                          value={effR * 100}
                          defaultValue={base.r * 100}
                          onChange={v => setOverride(sym, 'r', v / 100)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <ParamInput
                          value={effS * 100}
                          defaultValue={base.s * 100}
                          onChange={v => setOverride(sym, 's', v / 100)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <PriceInput
                          value={priceOverride[sym] ?? null}
                          onChange={v => setPriceOverride(prev => ({ ...prev, [sym]: v }))}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-slate-700 px-4 py-2 space-y-1">
              <p className="text-[10px] text-slate-600">
                {fetching
                  ? 'Fetching 2 years of weekly price history from Yahoo Finance…'
                  : 'Return & volatility computed from 2 years of weekly closes (Yahoo Finance, cached 24h). Blue = manually overridden.'}
              </p>
              {priceErrors.length > 0 && (
                <p className="text-[10px] text-red-400">{priceErrors.join(' · ')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {staleCorr && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400">
          <AlertTriangle size={12} /> Correlation data updated since last run — consider re-running.
        </div>
      )}

      {running && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center text-slate-500 text-sm animate-pulse">
          Running backward elimination — {nSim.toLocaleString()} simulations per subset…
        </div>
      )}

      {result && !running && (
        <>
          {/* Summary */}
          <div className={`rounded-xl border p-4 ${result.improved ? 'bg-green-500/5 border-green-500/30' : 'bg-slate-800 border-slate-700'}`}>
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Full portfolio Sharpe</p>
                <p className="text-2xl font-bold text-slate-200 tabular-nums">{fmt2(result.fullSharpe)}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{result.fullSymbols.join(', ')}</p>
              </div>
              <div className="text-2xl text-slate-600">→</div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Optimal subset Sharpe</p>
                <p className={`text-2xl font-bold tabular-nums ${result.improved ? 'text-green-400' : 'text-slate-400'}`}>
                  {fmt2(result.optimalSharpe)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{result.optimalSymbols.join(', ')}</p>
              </div>
              <div className="ml-auto text-right">
                {result.improved ? (
                  <>
                    <div className="flex items-center gap-1 text-green-400 font-bold text-lg">
                      <TrendingUp size={18} />
                      {fmtPct(((result.optimalSharpe - result.fullSharpe) / Math.abs(result.fullSharpe)) * 100)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Drop {result.dropped.join(', ')} to improve Sharpe
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400 font-semibold text-sm">
                    <CheckCircle size={15} className="text-emerald-400" />
                    Full portfolio is already optimal
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Elimination steps */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Elimination Trail</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Each step shows what happened when the worst-contributing stock was removed</p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {result.steps.map((step, i) => {
                const prev = result.steps[i - 1]
                const delta = prev ? ((step.sharpe - prev.sharpe) / Math.abs(prev.sharpe)) * 100 : null
                const isOptimal = step === result.steps[result.steps.length - 1] && result.improved
                const alloc = step.symbols.map((sym, idx) => ({
                  sym, w: +(step.weights[idx] * 100).toFixed(1),
                })).sort((a, b) => b.w - a.w)
                return (
                  <div key={i} className={`group ${isOptimal ? 'bg-green-500/5' : 'hover:bg-slate-700/20'} transition-colors`}>
                    <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <div className="w-6 text-center">
                      {i === 0 ? (
                        <span className="text-[10px] text-slate-600 font-bold">BASE</span>
                      ) : delta > 0 ? (
                        <TrendingUp size={14} className="text-green-400 mx-auto" />
                      ) : delta < 0 ? (
                        <TrendingDown size={14} className="text-red-400 mx-auto" />
                      ) : (
                        <Minus size={14} className="text-slate-500 mx-auto" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1">
                        {result.fullSymbols.map(sym => {
                          const inSet = step.symbols.includes(sym)
                          const dropped = step.dropped === sym
                          return (
                            <span key={sym} className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                              dropped      ? 'bg-red-500/20 text-red-400 line-through'
                              : inSet      ? 'bg-slate-700 text-slate-200'
                                           : 'bg-slate-900 text-slate-600'
                            }`}>
                              {sym}
                            </span>
                          )
                        })}
                      </div>
                      {step.dropped && (
                        <p className="text-[10px] text-slate-500 mt-0.5">Dropped <span className="text-red-400 font-mono">{step.dropped}</span></p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-slate-200">{fmt2(step.sharpe)}</p>
                      {delta != null && (
                        <p className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtPct(delta)}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[10px] text-slate-600 tabular-nums w-24 hidden sm:block">
                      <div>Ret {step.ret}%</div>
                      <div>Vol {step.vol}%</div>
                    </div>

                    {isOptimal && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-semibold">
                        Optimal
                      </span>
                    )}
                    </div>

                    {/* Allocation on hover */}
                    <div className="hidden group-hover:block px-4 pb-3">
                      <div className="border-t border-slate-700/50 pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                          {alloc.map(({ sym, w }, idx) => {
                            const pos = portfolioMap[sym]
                            const price = priceOverride[sym] ?? pos?.price ?? 0
                            const targetValue = totalInvestValue * (w / 100)
                            const targetShares = price > 0 ? targetValue / price : null
                            const currentShares = pos?.shares ?? 0
                            const delta = targetShares != null ? targetShares - currentShares : null
                            return (
                              <div key={sym} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${COLORS[idx % COLORS.length]}`} />
                                <span className="font-mono font-bold text-[11px] text-slate-300 w-12 shrink-0">{sym}</span>
                                <span className="text-[11px] tabular-nums text-slate-400">{w}%</span>
                                {delta != null ? (
                                  <span className={`text-[11px] tabular-nums font-semibold ml-1 ${delta > 0.5 ? 'text-green-400' : delta < -0.5 ? 'text-red-400' : 'text-slate-500'}`}>
                                    {delta > 0.5 ? `+${delta.toFixed(1)}` : delta < -0.5 ? delta.toFixed(1) : '≈ hold'}{Math.abs(delta) > 0.5 ? ' sh' : ''}
                                  </span>
                                ) : totalInvestValue > 0 ? (
                                  <span className="text-[11px] tabular-nums text-green-400 font-semibold ml-1">
                                    ${targetValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                        {totalInvestValue > 0 && (
                          <p className="text-[10px] text-slate-600 mt-1.5">
                            Based on {mode === 'custom' ? 'investment amount' : 'portfolio value'} ${totalInvestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Optimal allocation */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recommended Weights — {result.optimalSymbols.join(', ')}
            </p>
            <div className="space-y-2.5">
              {result.optimalSymbols.map((sym, i) => {
                const w = +(result.optimalWeights[i] * 100).toFixed(1)
                const pos = portfolioMap[sym]
                const price = priceOverride[sym] ?? pos?.price ?? 0
                const targetValue = totalInvestValue * (w / 100)
                const targetShares = price > 0 ? targetValue / price : null
                const currentShares = pos?.shares ?? 0
                const delta = targetShares != null ? targetShares - currentShares : null
                return (
                  <div key={sym} className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-slate-300 w-14 shrink-0">{sym}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                        style={{ width: `${w}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-300 w-10 text-right shrink-0">{w}%</span>
                    {delta != null ? (
                      <span className={`text-xs tabular-nums font-semibold w-20 text-right shrink-0 ${delta > 0.5 ? 'text-green-400' : delta < -0.5 ? 'text-red-400' : 'text-slate-500'}`}>
                        {delta > 0.5 ? `+${delta.toFixed(1)}` : delta < -0.5 ? delta.toFixed(1) : '≈ hold'}{Math.abs(delta) > 0.5 ? ' sh' : ''}
                      </span>
                    ) : totalInvestValue > 0 ? (
                      <span className="text-xs tabular-nums text-green-400 font-semibold w-20 text-right shrink-0">
                        ${targetValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    ) : <span className="w-20 shrink-0" />}
                  </div>
                )
              })}
            </div>
            {totalInvestValue > 0 && (
              <p className="text-[10px] text-slate-600 mt-3">
                Based on {mode === 'custom' ? 'investment amount' : 'portfolio value'} ${totalInvestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Weights shown are from the max-Sharpe simulation run — run multiple times to confirm stability.
              </p>
            )}
            {totalInvestValue === 0 && (
              <p className="text-[10px] text-slate-600 mt-3">
                Weights shown are from the max-Sharpe simulation run. Actual optimal weights vary slightly each run due to Monte Carlo randomness — run multiple times to confirm stability.
              </p>
            )}
          </div>

        </>
      )}
    </div>
  )
}
