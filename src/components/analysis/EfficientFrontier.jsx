import { useMemo, useState, useEffect, useCallback } from 'react'
import { ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, CartesianGrid } from 'recharts'
import { generateEfficientFrontierData, getAssetParams, getDefaultParams } from '../../utils/efficientFrontier'
import { Info, X, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

const RISK_FREE_DISPLAY = 4.5

function ParamEditor({ investments, overrides, onChange, onReset }) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  const symbols = open.map(i => i.symbol)
  const defaults = useMemo(() => getDefaultParams(symbols), [symbols.join(',')])

  function getVal(sym, field) {
    return overrides[sym]?.[field] ?? defaults.find(d => d.symbol === sym)?.[field] ?? (field === 'r' ? 0.12 : 0.25)
  }

  function handleChange(sym, field, raw) {
    const val = Math.max(0, Math.min(field === 'r' ? 2 : 3, parseFloat(raw) / 100 || 0))
    onChange(sym, field, val)
  }

  const isModified = (sym) => overrides[sym] !== undefined

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Asset Parameters</p>
          <p className="text-xs text-slate-600 mt-0.5">Override estimated annual expected return and volatility per asset. Changes re-run the simulation instantly.</p>
        </div>
        <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors bg-slate-700/50 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg shrink-0 ml-4">
          <RotateCcw size={11} /> Reset all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Symbol</th>
              <th className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-center" colSpan={2}>
                Expected Annual Return
                <span className="ml-1 text-slate-600 normal-case font-normal">(default shown)</span>
              </th>
              <th className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-center" colSpan={2}>
                Annual Volatility
                <span className="ml-1 text-slate-600 normal-case font-normal">(default shown)</span>
              </th>
              <th className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-right">Implied Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map(sym => {
              const r = getVal(sym, 'r')
              const s = getVal(sym, 's')
              const sharpe = s > 0 ? ((r - RISK_FREE_DISPLAY / 100) / s).toFixed(2) : '—'
              const sharpeColor = parseFloat(sharpe) >= 1 ? 'text-green-400' : parseFloat(sharpe) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
              const defR = defaults.find(d => d.symbol === sym)?.r ?? 0.12
              const defS = defaults.find(d => d.symbol === sym)?.s ?? 0.25
              const modified = isModified(sym)

              return (
                <tr key={sym} className={`border-b border-slate-700/40 hover:bg-slate-700/20 ${modified ? 'bg-blue-500/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{sym}</span>
                      {modified && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">custom</span>}
                    </div>
                    <div className="text-slate-600 text-[10px]">default: {(defR*100).toFixed(0)}% / {(defS*100).toFixed(0)}%</div>
                  </td>

                  {/* Return slider + input */}
                  <td className="px-2 py-2.5 w-32">
                    <input type="range" min="0" max="100" step="1"
                      value={Math.round(r * 100)}
                      onChange={e => handleChange(sym, 'r', e.target.value)}
                      className="w-full h-1.5 accent-green-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2.5 w-20">
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" max="200" step="1"
                        value={Math.round(r * 100)}
                        onChange={e => handleChange(sym, 'r', e.target.value)}
                        className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-right focus:outline-none focus:border-green-500"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>

                  {/* Vol slider + input */}
                  <td className="px-2 py-2.5 w-32">
                    <input type="range" min="1" max="150" step="1"
                      value={Math.round(s * 100)}
                      onChange={e => handleChange(sym, 's', e.target.value)}
                      className="w-full h-1.5 accent-yellow-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2.5 w-20">
                    <div className="flex items-center gap-1">
                      <input type="number" min="1" max="300" step="1"
                        value={Math.round(s * 100)}
                        onChange={e => handleChange(sym, 's', e.target.value)}
                        className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-right focus:outline-none focus:border-yellow-500"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>

                  <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${sharpeColor}`}>
                    {sharpe}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 px-4 py-2 border-t border-slate-700">
        Risk-free rate: {RISK_FREE_DISPLAY}% (used for Sharpe calculation). Sharpe = (Return − {RISK_FREE_DISPLAY}%) ÷ Volatility.
      </p>
    </div>
  )
}

function InfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-base font-semibold text-slate-100">How the Efficient Frontier Works</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm text-slate-300 leading-relaxed">

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">What is the Efficient Frontier?</h3>
            <p>
              The Efficient Frontier is a concept from Modern Portfolio Theory (MPT), developed by Harry Markowitz in 1952.
              It represents the set of portfolios that offer the <span className="text-white font-medium">highest expected return for a given level of risk</span> — or equivalently,
              the lowest risk for a given expected return. Any portfolio that sits below this curve is considered suboptimal,
              because you could get a better return for the same risk, or the same return with less risk.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">The Chart</h3>
            <p>
              The curve traces the <span className="text-white font-medium">efficient frontier</span> — only portfolios where no other allocation offers higher return for the same risk (or lower risk for the same return).
              The x-axis shows annualized volatility (risk) and the y-axis shows expected annual return.
              Points to the upper-left are better: more return, less risk.
            </p>
            <ul className="mt-2 space-y-1 pl-3 border-l-2 border-slate-700">
              <li><span className="text-yellow-400 font-semibold">● Your Portfolio</span> — your current allocation based on market value weights</li>
              <li><span className="text-sky-400 font-semibold">● Min Volatility</span> — the allocation with the lowest risk found across all simulations</li>
              <li><span className="text-violet-400 font-semibold">● Max Sharpe</span> — the allocation with the best risk-adjusted return (highest Sharpe ratio)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">How It's Calculated</h3>
            <ol className="space-y-2 list-decimal list-inside">
              <li>
                <span className="text-white font-medium">Assign parameters</span> — each asset is given an estimated annual expected return (e.g. NVDA: 38%) and annual volatility (e.g. NVDA: 55%) based on historical averages for that ticker or asset class.
              </li>
              <li>
                <span className="text-white font-medium">Build a correlation matrix</span> — assets are grouped into categories (Tech, ETF Equity, Bonds, Gold, Crypto, Energy, Financial). A correlation value between −1 and 1 is assigned for each pair. For example, tech stocks are highly correlated with each other (~0.65) but have a negative correlation with bonds (~−0.10).
              </li>
              <li>
                <span className="text-white font-medium">Generate random portfolios</span> — 6,000 portfolios are created by randomly assigning weights to your holdings (weights always sum to 100%). The weights follow a Dirichlet distribution so all combinations are possible.
              </li>
              <li>
                <span className="text-white font-medium">Calculate portfolio stats</span> — for each random portfolio:
                <div className="mt-1.5 bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1">
                  <p>Return  = Σ (wᵢ × rᵢ)</p>
                  <p>Variance = Σ Σ (wᵢ × wⱼ × σᵢ × σⱼ × ρᵢⱼ)</p>
                  <p>Sharpe  = (Return − Risk-free rate) / √Variance</p>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">Risk-free rate = 4.5% (approximate current T-bill yield)</p>
              </li>
              <li>
                <span className="text-white font-medium">Extract the efficient frontier</span> — from all 10,000 simulations, the frontier is built by bucketing portfolios by volatility and keeping only the max-return portfolio per bucket, then applying a Pareto filter to remove any dominated points. The result is the clean curve shown.
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">The Sharpe Ratio</h3>
            <p>
              The Sharpe ratio measures return per unit of risk. A Sharpe of <span className="text-green-400 font-medium">1.0</span> means you earn 1% of return above the risk-free rate for every 1% of volatility.
              Higher is better. Generally: below 0 is poor, 0.5–1.0 is acceptable, 1.0–2.0 is good, above 2.0 is exceptional.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">The Comparison Table</h3>
            <p>
              The table shows exactly how to rebalance from your current portfolio to each optimal target.
              A <span className="text-green-400 font-medium">+X%</span> means increase that position's share of your portfolio,
              a <span className="text-red-400 font-medium">−X%</span> means reduce it.
              These are <span className="text-white font-medium">portfolio weight changes</span>, not share counts — you'd apply them as a percentage of your total invested capital.
            </p>
          </section>

          <section className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-2">Important Limitations</h3>
            <ul className="space-y-1 text-yellow-200/80 text-xs">
              <li>• Expected returns and volatilities are <strong>estimated assumptions</strong>, not guaranteed future values</li>
              <li>• Real correlations change over time — especially during market crises, assets tend to correlate more</li>
              <li>• The simulation uses only your current holdings — it cannot suggest new assets to add</li>
              <li>• This does not account for taxes, transaction costs, or position size constraints</li>
              <li>• <strong>This is not financial advice.</strong> Always consult a financial professional before rebalancing</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}

const PORTFOLIO_COLORS = {
  current:  { dot: '#f59e0b', accent: 'border-t-yellow-500', label: 'Your Portfolio',  note: 'Current allocation' },
  minVol:   { dot: '#38bdf8', accent: 'border-t-sky-500',    label: 'Min Volatility',  note: 'Lowest risk' },
  maxSharpe:{ dot: '#a78bfa', accent: 'border-t-violet-500', label: 'Max Sharpe',      note: 'Best risk-adjusted return' },
}

const COLORS_PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a3e635']

const COLORS_TOOLTIP = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1','#14b8a6','#a3e635']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-xl shadow-xl p-3 text-xs min-w-[200px]">
      <div className="flex gap-3 mb-2.5 pb-2.5 border-b border-slate-700">
        <div>
          <p className="text-slate-500 leading-none mb-0.5">Return</p>
          <p className="font-bold text-green-400 text-sm">{d.ret?.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-slate-500 leading-none mb-0.5">Volatility</p>
          <p className="font-bold text-yellow-400 text-sm">{d.vol?.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-slate-500 leading-none mb-0.5">Sharpe</p>
          <p className="font-bold text-blue-400 text-sm">{d.sharpe?.toFixed(2)}</p>
        </div>
      </div>
      {d.allocation?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold mb-1">Allocation</p>
          {d.allocation.map(({ symbol, weight }, i) => (
            <div key={symbol} className="flex items-center gap-2">
              <span className="text-slate-300 font-semibold w-10 shrink-0">{symbol}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${weight}%`, background: COLORS_TOOLTIP[i % COLORS_TOOLTIP.length] }} />
              </div>
              <span className="text-slate-400 tabular-nums w-9 text-right">{weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AllocationTable({ allocation, dotColor }) {
  if (!allocation?.length) return null
  return (
    <div className="mt-4 border-t border-slate-700 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Suggested Allocation</p>
      <div className="space-y-1.5">
        {allocation.map(({ symbol, weight }, i) => (
          <div key={symbol} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200 w-14 shrink-0">{symbol}</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${weight}%`, background: COLORS_PALETTE[i % COLORS_PALETTE.length] }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-300 w-10 text-right">{weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonTable({ current, minVol, maxSharpe }) {
  if (!current?.allocation) return null
  const symbols = current.allocation.map(a => a.symbol)

  function getWeight(portfolio, symbol) {
    const entry = portfolio?.allocation?.find(a => a.symbol === symbol)
    return entry?.weight ?? 0
  }

  function diff(opt, sym) {
    const d = getWeight(opt, sym) - getWeight(current, sym)
    if (Math.abs(d) < 0.5) return null
    return d
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allocation Comparison</p>
        <p className="text-xs text-slate-600 mt-0.5">How to rebalance from your current portfolio to each optimal target</p>
      </div>
      <table className="w-full text-sm mt-2">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Symbol</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-yellow-500">Current</th>
            {minVol && <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-sky-400">Min Vol</th>}
            {minVol && <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Change</th>}
            {maxSharpe && <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-violet-400">Max Sharpe</th>}
            {maxSharpe && <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Change</th>}
          </tr>
        </thead>
        <tbody>
          {symbols.map((sym, i) => {
            const mvDiff = minVol ? diff(minVol, sym) : null
            const msDiff = maxSharpe ? diff(maxSharpe, sym) : null
            return (
              <tr key={sym} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS_PALETTE[i % COLORS_PALETTE.length] }} />
                    <span className="font-semibold text-slate-200">{sym}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-yellow-400 font-medium">
                  {getWeight(current, sym).toFixed(1)}%
                </td>
                {minVol && (
                  <td className="px-4 py-2.5 text-right tabular-nums text-sky-400 font-medium">
                    {getWeight(minVol, sym).toFixed(1)}%
                  </td>
                )}
                {minVol && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                    {mvDiff === null
                      ? <span className="text-slate-600">—</span>
                      : <span className={mvDiff > 0 ? 'text-green-400' : 'text-red-400'}>{mvDiff > 0 ? '+' : ''}{mvDiff.toFixed(1)}%</span>
                    }
                  </td>
                )}
                {maxSharpe && (
                  <td className="px-4 py-2.5 text-right tabular-nums text-violet-400 font-medium">
                    {getWeight(maxSharpe, sym).toFixed(1)}%
                  </td>
                )}
                {maxSharpe && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                    {msDiff === null
                      ? <span className="text-slate-600">—</span>
                      : <span className={msDiff > 0 ? 'text-green-400' : 'text-red-400'}>{msDiff > 0 ? '+' : ''}{msDiff.toFixed(1)}%</span>
                    }
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function EfficientFrontier({ investments }) {
  const [showInfo, setShowInfo] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [overrides, setOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bt_ef_params') || '{}') } catch { return {} }
  })

  const handleParamChange = useCallback((sym, field, val) => {
    setOverrides(prev => {
      const next = { ...prev, [sym]: { ...(prev[sym] || {}), [field]: val } }
      localStorage.setItem('bt_ef_params', JSON.stringify(next))
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setOverrides({})
    localStorage.removeItem('bt_ef_params')
  }, [])

  const { frontier, current, minVol, maxSharpe } = useMemo(
    () => generateEfficientFrontierData(investments, overrides),
    [investments, overrides]
  )

  const open = investments.filter(i => i.status === 'open')
  if (open.length < 2) {
    return <div className="text-center text-slate-500 py-16 text-sm">Need at least 2 open positions to generate the efficient frontier.</div>
  }

  return (
    <div className="space-y-4">
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* Scatter chart */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Efficient Frontier</p>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg"
          >
            <Info size={13} /> How this works
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Showing only the efficient frontier — portfolios where no other allocation offers higher return for the same risk.
        </p>

        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={frontier} margin={{ top: 10, right: 20, bottom: 24, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="vol" type="number" domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%"
              label={{ value: 'Annualized Volatility (%)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              dataKey="ret" type="number" domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%"
              label={{ value: 'Expected Return (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Frontier curve */}
            <Line
              type="monotone" dataKey="ret"
              stroke="#3b82f6" strokeWidth={2.5}
              dot={{ r: 3, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: '#60a5fa' }}
            />

            {/* Optimal portfolio markers */}
            {minVol && (
              <ReferenceDot x={minVol.vol} y={minVol.ret} r={9} fill="#38bdf8" stroke="#1e293b" strokeWidth={2}
                label={{ value: 'Min Vol', position: 'top', fill: '#38bdf8', fontSize: 10 }} />
            )}
            {maxSharpe && (
              <ReferenceDot x={maxSharpe.vol} y={maxSharpe.ret} r={9} fill="#a78bfa" stroke="#1e293b" strokeWidth={2}
                label={{ value: 'Max Sharpe', position: 'top', fill: '#a78bfa', fontSize: 10 }} />
            )}
            {current && (
              <ReferenceDot x={current.vol} y={current.ret} r={11} fill="#f59e0b" stroke="#1e293b" strokeWidth={2}
                label={{ value: 'You', position: 'top', fill: '#f59e0b', fontSize: 10, fontWeight: 600 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 rounded bg-blue-500" />
            <span className="text-xs text-slate-400">Efficient Frontier</span>
          </div>
          {[['#f59e0b', 'Your Portfolio'], ['#38bdf8', 'Min Volatility'], ['#a78bfa', 'Max Sharpe']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-800" style={{ background: c }} />
              <span className="text-xs text-slate-300 font-medium">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Parameter editor toggle */}
      <div>
        <button
          onClick={() => setShowParams(p => !p)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-800 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl transition-colors w-full"
        >
          <SlidersHorizontal size={15} className="text-blue-400" />
          Adjust Expected Returns & Volatility
          {Object.keys(overrides).length > 0 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">
              {Object.keys(overrides).length} custom
            </span>
          )}
          <span className="ml-auto">{showParams ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </button>
        {showParams && (
          <div className="mt-2">
            <ParamEditor
              investments={investments}
              overrides={overrides}
              onChange={handleParamChange}
              onReset={handleReset}
            />
          </div>
        )}
      </div>

      {/* Three portfolio cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['current', 'minVol', 'maxSharpe']).map(key => {
          const pt = { current, minVol, maxSharpe }[key]
          if (!pt) return null
          const { dot, accent, label, note } = PORTFOLIO_COLORS[key]
          return (
            <div key={key} className={`bg-slate-800 rounded-xl border border-slate-700 border-t-2 ${accent} p-4`}>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-3 h-3 rounded-full" style={{ background: dot }} />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              </div>
              <p className="text-xs text-slate-600 mb-3">{note}</p>
              <div className="space-y-1.5 border-b border-slate-700 pb-3 mb-1">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Exp. Annual Return</span>
                  <span className="text-sm font-bold text-green-400">{pt.ret.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Annualized Volatility</span>
                  <span className="text-sm font-bold text-yellow-400">{pt.vol.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Sharpe Ratio</span>
                  <span className="text-sm font-bold text-blue-400">{pt.sharpe.toFixed(2)}</span>
                </div>
              </div>
              <AllocationTable allocation={pt.allocation} dotColor={dot} />
            </div>
          )
        })}
      </div>

      {/* Side-by-side comparison + changes */}
      <ComparisonTable current={current} minVol={minVol} maxSharpe={maxSharpe} />

      <p className="text-xs text-slate-600 text-center">
        Monte Carlo simulation using estimated historical parameters. These are mathematical optima — not financial advice. Past performance does not guarantee future results.
      </p>
    </div>
  )
}
