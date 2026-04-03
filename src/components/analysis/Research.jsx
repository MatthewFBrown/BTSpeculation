import { useState, useCallback, useEffect, useMemo } from 'react'
import { fetchFundamentals } from '../../utils/fetchFundamentals'
import { fetchFinancials } from '../../utils/fetchFinancials'
import { fmtInv } from '../../utils/investmentCalcs'
import { Search, X, RefreshCw, KeyRound, AlertTriangle, LayoutList, Columns, ExternalLink, ChevronDown, ChevronUp, DatabaseZap, Globe, TrendingUp, TrendingDown } from 'lucide-react'
import { getCorrelationMatrixForSymbols, setRealCorrelations, setComputedParams } from '../../utils/efficientFrontier'
import { fetchCorrelations } from '../../utils/fetchCorrelations'
import FrontierPanel from './FrontierPanel'
import { SECTORS } from '../../utils/sectorStocks'

// ── Formatters ────────────────────────────────────────────────
const fmt  = (v, suffix = '', dec = 2) => v == null || isNaN(v) ? '—' : `${Number(v).toFixed(dec)}${suffix}`
const fmtLarge = v => {
  if (v == null || isNaN(v)) return '—'
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return `$${Number(v).toLocaleString()}`
}

// Metric definitions for the compare table
// { label, get(d), format(v), better: 'high'|'low'|null }
const METRIC_GROUPS = [
  {
    group: 'Price',
    rows: [
      { label: 'Price',          get: d => d.quote?.c,                                    format: v => `$${fmt(v)}`,         better: null },
      { label: 'Day Change',     get: d => d.quote?.dp,                                   format: v => `${fmt(v)}%`,         better: 'high' },
      { label: '52W High',       get: d => d.metrics?.['52WeekHigh'],                     format: v => `$${fmt(v)}`,         better: null },
      { label: '52W Low',        get: d => d.metrics?.['52WeekLow'],                      format: v => `$${fmt(v)}`,         better: null },
      { label: '52W Return',     get: d => d.metrics?.['52WeekPriceReturnDaily'],          format: v => `${fmt(v)}%`,         better: 'high' },
    ],
  },
  {
    group: 'Valuation',
    rows: [
      { label: 'Market Cap',     get: d => d.profile?.marketCapitalization * 1e6,         format: fmtLarge,                  better: null },
      { label: 'P/E (TTM)',      get: d => d.metrics?.peBasicExclExtraTTM,                format: v => fmt(v),               better: 'low' },
      { label: 'P/S (TTM)',      get: d => d.metrics?.psTTM,                              format: v => fmt(v),               better: 'low' },
      { label: 'P/B',           get: d => d.metrics?.pbQuarterly,                         format: v => fmt(v),               better: 'low' },
      { label: 'EV/EBITDA',     get: d => d.metrics?.evEbitdaTTM,                         format: v => fmt(v),               better: 'low' },
      { label: 'EPS (TTM)',     get: d => d.metrics?.epsTTM,                              format: v => `$${fmt(v)}`,         better: 'high' },
      { label: 'Div. Yield',    get: d => d.metrics?.dividendYieldIndicatedAnnual,        format: v => `${fmt(v)}%`,         better: 'high' },
    ],
  },
  {
    group: 'Growth & Profitability',
    rows: [
      { label: 'Revenue/Share', get: d => d.metrics?.revenuePerShareTTM,                 format: v => `$${fmt(v)}`,         better: 'high' },
      { label: 'Rev Growth YoY',get: d => d.metrics?.revenueGrowthTTMYoy,               format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'EPS Growth YoY',get: d => d.metrics?.epsGrowthTTMYoy,                   format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'Net Margin',    get: d => d.metrics?.netProfitMarginTTM,                 format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'Gross Margin',  get: d => d.metrics?.grossMarginTTM,                     format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'ROE',           get: d => d.metrics?.roeTTM,                             format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'ROA',           get: d => d.metrics?.roaTTM,                             format: v => `${fmt(v)}%`,         better: 'high' },
    ],
  },
  {
    group: 'Risk & Balance Sheet',
    rows: [
      { label: 'Beta',           get: d => d.metrics?.beta,                              format: v => fmt(v),               better: 'low' },
      { label: 'Debt/Equity',    get: d => d.metrics?.totalDebt_totalEquityQuarterly,    format: v => fmt(v),               better: 'low' },
      { label: 'Current Ratio',  get: d => d.metrics?.currentRatioQuarterly,             format: v => fmt(v),               better: 'high' },
      { label: 'Shares Out.',    get: d => d.metrics?.sharesOutstanding,                 format: v => v != null ? `${(v/1e6).toFixed(1)}M` : '—', better: null },
    ],
  },
  {
    group: 'Analyst Consensus',
    rows: [
      { label: 'Target Low',     get: d => d.targets?.targetLow,                         format: v => `$${fmt(v)}`,         better: null },
      { label: 'Target Mean',    get: d => d.targets?.targetMean,                        format: v => `$${fmt(v)}`,         better: null },
      { label: 'Target High',    get: d => d.targets?.targetHigh,                        format: v => `$${fmt(v)}`,         better: null },
      { label: 'Upside to Mean', get: d => d.targets?.targetMean && d.quote?.c ? ((d.targets.targetMean - d.quote.c) / d.quote.c) * 100 : null,
                                                                                          format: v => `${fmt(v)}%`,         better: 'high' },
      { label: 'Strong Buy',     get: d => d.recs?.strongBuy,                            format: v => fmt(v, '', 0),        better: 'high' },
      { label: 'Buy',            get: d => d.recs?.buy,                                  format: v => fmt(v, '', 0),        better: 'high' },
      { label: 'Hold',           get: d => d.recs?.hold,                                 format: v => fmt(v, '', 0),        better: null },
      { label: 'Sell',           get: d => d.recs?.sell,                                 format: v => fmt(v, '', 0),        better: 'low' },
    ],
  },
]

// ── Single stock detail view ──────────────────────────────────
function StatRow({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${color}`}>{value}</span>
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

function AnalystBar({ strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 }) {
  const total = (strongBuy + buy + hold + sell + strongSell) || 1
  return (
    <div className="space-y-1.5 mt-2">
      {[
        { label: 'Strong Buy', count: strongBuy,  color: '#10b981' },
        { label: 'Buy',        count: buy,         color: '#84cc16' },
        { label: 'Hold',       count: hold,        color: '#eab308' },
        { label: 'Sell',       count: sell,        color: '#f97316' },
        { label: 'Strong Sell',count: strongSell,  color: '#ef4444' },
      ].map(b => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-20 shrink-0">{b.label}</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(b.count/total)*100}%`, background: b.color }} />
          </div>
          <span className="text-xs font-semibold text-slate-300 w-4 text-right">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

function SingleView({ sym, d }) {
  const m = d.metrics || {}
  const pnColor = v => v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-slate-200'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-start gap-4">
        {d.profile?.logo && (
          <img src={d.profile.logo} alt="" className="w-12 h-12 rounded-lg object-contain bg-white p-1 shrink-0" onError={e => e.target.style.display='none'} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-100">{d.profile?.name || sym}</h2>
              <p className="text-xs text-slate-500">{d.profile?.exchange} · {d.profile?.finnhubIndustry}</p>
            </div>
            {d.profile?.weburl && (
              <a href={d.profile.weburl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400"><ExternalLink size={14} /></a>
            )}
          </div>
          {d.quote && (
            <div className="flex flex-wrap gap-4 mt-2">
              <div>
                <span className="text-lg font-bold text-slate-100">${d.quote.c?.toFixed(2)}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Panel title="Valuation" accent="border-t-blue-500">
          <StatRow label="Market Cap"    value={fmtLarge(d.profile?.marketCapitalization * 1e6)} />
          <StatRow label="P/E (TTM)"    value={fmt(m.peBasicExclExtraTTM)} color={m.peBasicExclExtraTTM > 30 ? 'text-yellow-400' : m.peBasicExclExtraTTM < 15 ? 'text-green-400' : 'text-slate-200'} />
          <StatRow label="P/S (TTM)"    value={fmt(m.psTTM)} />
          <StatRow label="P/B"          value={fmt(m.pbQuarterly)} />
          <StatRow label="EV/EBITDA"    value={fmt(m.evEbitdaTTM)} />
          <StatRow label="EPS (TTM)"    value={m.epsTTM != null ? `$${fmt(m.epsTTM)}` : '—'} />
          <StatRow label="Div. Yield"   value={fmt(m.dividendYieldIndicatedAnnual, '%')} color={m.dividendYieldIndicatedAnnual > 0 ? 'text-green-400' : 'text-slate-500'} />
        </Panel>
        <Panel title="Growth & Profitability" accent="border-t-emerald-500">
          <StatRow label="Rev/Share"    value={m.revenuePerShareTTM != null ? `$${fmt(m.revenuePerShareTTM)}` : '—'} />
          <StatRow label="Rev Growth"   value={fmt(m.revenueGrowthTTMYoy, '%')} color={pnColor(m.revenueGrowthTTMYoy)} />
          <StatRow label="EPS Growth"   value={fmt(m.epsGrowthTTMYoy, '%')} color={pnColor(m.epsGrowthTTMYoy)} />
          <StatRow label="Net Margin"   value={fmt(m.netProfitMarginTTM, '%')} color={pnColor(m.netProfitMarginTTM)} />
          <StatRow label="Gross Margin" value={fmt(m.grossMarginTTM, '%')} />
          <StatRow label="ROE"          value={fmt(m.roeTTM, '%')} color={m.roeTTM > 15 ? 'text-green-400' : pnColor(m.roeTTM)} />
          <StatRow label="ROA"          value={fmt(m.roaTTM, '%')} color={m.roaTTM > 5 ? 'text-green-400' : pnColor(m.roaTTM)} />
        </Panel>
        <Panel title="Risk & Price Range" accent="border-t-yellow-500">
          <StatRow label="Beta"         value={fmt(m.beta)} color={m.beta > 1.5 ? 'text-red-400' : m.beta < 0.8 ? 'text-blue-400' : 'text-slate-200'} />
          <StatRow label="Debt/Equity"  value={fmt(m.totalDebt_totalEquityQuarterly)} color={m.totalDebt_totalEquityQuarterly > 2 ? 'text-red-400' : 'text-slate-200'} />
          <StatRow label="Current Ratio"value={fmt(m.currentRatioQuarterly)} color={m.currentRatioQuarterly > 1.5 ? 'text-green-400' : m.currentRatioQuarterly < 1 ? 'text-red-400' : 'text-yellow-400'} />
          <StatRow label="52W High"     value={m['52WeekHigh'] != null ? `$${fmt(m['52WeekHigh'])}` : '—'} />
          <StatRow label="52W Low"      value={m['52WeekLow'] != null ? `$${fmt(m['52WeekLow'])}` : '—'} />
          <StatRow label="52W Return"   value={fmt(m['52WeekPriceReturnDaily'], '%')} color={pnColor(m['52WeekPriceReturnDaily'])} />
          <StatRow label="Shares Out."  value={m.sharesOutstanding != null ? `${(m.sharesOutstanding/1e6).toFixed(1)}M` : '—'} />
        </Panel>
        {d.recs && (
          <Panel title="Analyst Recommendations" accent="border-t-violet-500">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-400">Period</span>
              <span className="text-xs font-semibold text-slate-300">{d.recs.period}</span>
            </div>
            <AnalystBar {...d.recs} />
            <div className="flex justify-between text-xs mt-3 pt-2 border-t border-slate-700">
              <span className="text-slate-500">Total analysts</span>
              <span className="font-semibold text-slate-300">{d.recs.strongBuy + d.recs.buy + d.recs.hold + d.recs.sell + d.recs.strongSell}</span>
            </div>
          </Panel>
        )}
        {d.targets?.targetMean && (
          <Panel title="Analyst Price Target" accent="border-t-cyan-500">
            <StatRow label="Target Low"  value={`$${fmt(d.targets.targetLow)}`} />
            <StatRow label="Target Mean" value={`$${fmt(d.targets.targetMean)}`} color="text-blue-400" />
            <StatRow label="Target High" value={`$${fmt(d.targets.targetHigh)}`} />
            <StatRow label="# Analysts"  value={d.targets.targetNumberOfAnalysts ?? '—'} />
            {d.quote?.c && (
              <StatRow label="Upside to Mean"
                value={`${(((d.targets.targetMean - d.quote.c) / d.quote.c) * 100).toFixed(1)}%`}
                color={d.targets.targetMean >= d.quote.c ? 'text-green-400' : 'text-red-400'} />
            )}
          </Panel>
        )}
      </div>

      {/* News */}
      {d.news?.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recent News (30 days)</p>
          <div className="divide-y divide-slate-700/50">
            {d.news.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                className="flex gap-3 p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group">
                {item.image && <img src={item.image} alt="" className="w-14 h-14 rounded object-cover shrink-0 opacity-80" onError={e => e.target.style.display='none'} />}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 line-clamp-2 group-hover:text-blue-400 transition-colors">{item.headline}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.source} · {new Date(item.datetime*1000).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Compare table ─────────────────────────────────────────────
function CompareView({ symbols, dataMap }) {
  const loaded = symbols.filter(s => dataMap[s])

  if (loaded.length < 2) {
    return <div className="text-center text-slate-500 py-12 text-sm">Load at least 2 stocks to compare.</div>
  }

  function bestIdx(values, better) {
    if (better === null) return -1
    const nums = values.map(v => (v == null || isNaN(v)) ? null : Number(v))
    if (nums.every(v => v === null)) return -1
    const valid = nums.filter(v => v !== null)
    const best = better === 'high' ? Math.max(...valid) : Math.min(...valid)
    return nums.indexOf(best)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-600">
            <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider w-40">Metric</th>
            {loaded.map(sym => (
              <th key={sym} className="px-4 py-3 text-center">
                <div className="font-bold text-slate-100 text-sm">{sym}</div>
                {dataMap[sym]?.profile?.name && (
                  <div className="text-[10px] text-slate-500 font-normal truncate max-w-[120px]">{dataMap[sym].profile.name}</div>
                )}
                {dataMap[sym]?.quote?.c && (
                  <div className="text-sm font-bold text-slate-200 mt-0.5">${dataMap[sym].quote.c.toFixed(2)}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRIC_GROUPS.map(group => (
            <>
              <tr key={group.group} className="bg-slate-700/30">
                <td colSpan={loaded.length + 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {group.group}
                </td>
              </tr>
              {group.rows.map(row => {
                const values = loaded.map(s => row.get(dataMap[s]))
                const best = bestIdx(values, row.better)
                return (
                  <tr key={row.label} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                    <td className="px-4 py-2.5 text-slate-400 font-medium">{row.label}</td>
                    {values.map((v, i) => {
                      const isNullVal = v == null || (typeof v === 'number' && isNaN(v))
                      const isBest = !isNullVal && i === best
                      const isPositive = typeof v === 'number' && v > 0
                      const isNegative = typeof v === 'number' && v < 0
                      let color = 'text-slate-300'
                      if (isBest) color = 'text-green-400'
                      else if (row.better && isNegative) color = 'text-red-400'
                      return (
                        <td key={i} className={`px-4 py-2.5 text-center tabular-nums font-semibold ${color} ${isBest ? 'bg-green-500/5' : ''}`}>
                          {isNullVal ? <span className="text-slate-600">—</span> : row.format(v)}
                          {isBest && <span className="ml-1 text-[9px] text-green-500">▲</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Correlation heatmap ───────────────────────────────────────
function corrColor(v) {
  if (v >= 0.7)  return 'bg-red-500/80 text-white'
  if (v >= 0.4)  return 'bg-orange-500/60 text-white'
  if (v >= 0.15) return 'bg-yellow-500/40 text-slate-200'
  if (v >= -0.05) return 'bg-slate-600/60 text-slate-300'
  return 'bg-blue-500/50 text-white'
}

function CorrelationHeatmap({ portSymbols, researchSymbols, corrVersion = 0 }) {
  const allSymbols = [...portSymbols, ...researchSymbols]
  const { matrix } = useMemo(() => getCorrelationMatrixForSymbols(allSymbols), [allSymbols.join(','), corrVersion])  // eslint-disable-line

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse mx-auto">
        <thead>
          <tr>
            <th className="w-12 h-8" />
            {allSymbols.map(sym => (
              <th key={sym} className="px-1 pb-2 font-mono font-bold text-center">
                <span className={researchSymbols.includes(sym) ? 'text-violet-400' : 'text-blue-400'}>{sym}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allSymbols.map((row, i) => (
            <tr key={row}>
              <td className="pr-2 py-0.5 font-mono font-bold text-right">
                <span className={researchSymbols.includes(row) ? 'text-violet-400' : 'text-blue-400'}>{row}</span>
              </td>
              {matrix[i].map((val, j) => (
                <td key={j} className={`w-10 h-8 text-center font-semibold tabular-nums rounded-sm mx-px ${j > i ? '' : corrColor(i === j ? 0 : val)}`}>
                  {j > i ? '' : i === j ? '—' : val.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3 text-[10px]">
        {[
          ['bg-blue-500/50', '< 0 (negative)'],
          ['bg-slate-600/60', '0–0.15 (uncorrelated)'],
          ['bg-yellow-500/40', '0.15–0.4 (low)'],
          ['bg-orange-500/60', '0.4–0.7 (moderate)'],
          ['bg-red-500/80', '> 0.7 (high)'],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${cls}`} />
            <span className="text-slate-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-400 font-bold font-mono">AAPL</span>
          <span className="text-slate-500">= portfolio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-violet-400 font-bold font-mono">COIN</span>
          <span className="text-slate-500">= researched</span>
        </div>
      </div>
    </div>
  )
}


// ── Portfolio context panel ───────────────────────────────────
function PortfolioContext({ investments, loadedSymbols, dataMap, cash = 0, efResearchParamsKey = 'bt_ef_research_params' }) {
  const [open, setOpen]         = useState(true)
  const [subTab, setSubTab]     = useState('correlation')
  const [corrVersion, setCorrVersion] = useState(0)

  const openInv     = investments.filter(i => i.status === 'open')
  const portSymbols = openInv.map(i => i.symbol)
  const researchSymbols = loadedSymbols.filter(s => !portSymbols.includes(s))
  const allSymbols  = [...portSymbols, ...researchSymbols]

  // Fetch real correlations — increment corrVersion after so useMemos recompute
  useEffect(() => {
    if (allSymbols.length < 2) return
    fetchCorrelations(allSymbols).then(({ corrMap, paramsMap }) => {
      if (Object.keys(corrMap).length > 0) {
        setRealCorrelations(corrMap)
        setComputedParams(paramsMap)
        setCorrVersion(v => v + 1)
      }
    })
  }, [allSymbols.join(',')])  // eslint-disable-line

  // Build priceMap from loaded quote data for symbols not in portfolio
  const priceMap = useMemo(() => {
    const map = {}
    for (const sym of researchSymbols) {
      const q = dataMap[sym]?.quote?.c
      if (q) map[sym] = q
    }
    return map
  }, [researchSymbols.join(','), dataMap])  // eslint-disable-line

  if (openInv.length === 0) return null

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">Portfolio Context</p>
          <p className="text-xs text-slate-600 text-left mt-0.5">
            How researched stocks relate to your {portSymbols.length} current holdings
          </p>
        </div>
        {open ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-700 p-4">
          {/* Sub-tab toggle */}
          <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5 w-fit mb-4">
            {[['correlation','Correlation Matrix'],['frontier','Efficient Frontier']].map(([id, label]) => (
              <button key={id} onClick={() => setSubTab(id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  subTab === id ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {subTab === 'correlation' && (
            <CorrelationHeatmap
              portSymbols={portSymbols}
              researchSymbols={researchSymbols.length > 0 ? researchSymbols : loadedSymbols}
              corrVersion={corrVersion}
            />
          )}

          {subTab === 'frontier' && (
            researchSymbols.length === 0
              ? <p className="text-slate-500 text-sm text-center py-8">Load at least one stock not already in your portfolio to see the combined frontier.</p>
              : <FrontierPanel investments={investments} extraSymbols={researchSymbols} storageKey={efResearchParamsKey} priceMap={priceMap} cash={cash} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Sector Browser ────────────────────────────────────────────
function SectorBrowser({ onAdd, onSendToOptimizer, onSendToRisk, loadedSymbols = [] }) {
  const [open, setOpen]           = useState(false)
  const [activeSector, setActiveSector] = useState(SECTORS[0].id)
  const [selected, setSelected]   = useState(new Set())

  const sector = SECTORS.find(s => s.id === activeSector)

  function toggle(sym) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sym) ? next.delete(sym) : next.add(sym)
      return next
    })
  }

  function handleAdd() {
    onAdd([...selected])
    setSelected(new Set())
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sector Browser</span>
          <span className="text-[10px] text-slate-600">— top 20 stocks by market cap</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-700 p-4 space-y-3">
          {/* Sector tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SECTORS.map(s => (
              <button key={s.id} onClick={() => setActiveSector(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSector === s.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                }`}>
                {s.name}
              </button>
            ))}
          </div>

          {/* Stock grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {sector.stocks.map(({ sym, name }) => {
              const isSelected = selected.has(sym)
              return (
                <button key={sym} onClick={() => toggle(sym)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-700/50 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                  }`}>
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${
                    isSelected ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span>
                    <span className="block text-xs font-mono font-bold">{sym}</span>
                    <span className="block text-[10px] text-slate-500 leading-tight">{name}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-600">
              {selected.size > 0 ? `${selected.size} selected` : 'Click stocks to select'}
            </span>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                  Clear
                </button>
              )}
              {onSendToRisk && (
                <button
                  onClick={() => { onSendToRisk([...selected]); setSelected(new Set()) }}
                  disabled={selected.size < 2}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <TrendingDown size={12} /> Send to Risk
                </button>
              )}
              {onSendToOptimizer && (
                <button
                  onClick={() => {
                    const merged = [...new Set([...loadedSymbols, ...selected])]
                    onSendToOptimizer(merged)
                    setSelected(new Set())
                  }}
                  disabled={selected.size === 0 && loadedSymbols.length === 0}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                  <TrendingUp size={12} /> Send to Optimizer
                  {loadedSymbols.length > 0 && selected.size > 0 && (
                    <span className="text-[10px] bg-violet-500/40 px-1 rounded">+{loadedSymbols.length} loaded</span>
                  )}
                </button>
              )}
              <button
                onClick={handleAdd}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                <Columns size={12} /> Add to Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Research({ preloadSymbol, investments = [], cash = 0, efResearchParamsKey = 'bt_ef_research_params', onSendToOptimizer, onSendToRisk }) {
  const [input, setInput]           = useState('')
  const [symbols, setSymbols]       = useState([])
  const [dataMap, setDataMap]       = useState({})
  const [loading, setLoading]       = useState({})
  const [errors, setErrors]         = useState({})
  const [selected, setSelected]     = useState(null)
  const [view, setView]             = useState('single')  // 'single' | 'compare'
  const [finLoading, setFinLoading] = useState({})
  const [finLoaded, setFinLoaded]   = useState({})

  const apiKey = localStorage.getItem('bt_finnhub_key') || ''
  const FIN_CACHE_KEY = 'bt_financials_cache'

  // Load symbol sent from Watchlist
  useEffect(() => {
    if (preloadSymbol) loadSymbol(preloadSymbol)
  }, [preloadSymbol]) // eslint-disable-line

  const loadSymbol = useCallback(async (raw) => {
    const sym = raw.trim().toUpperCase()
    if (!sym || !apiKey) return
    if (dataMap[sym]) { setSelected(sym); return }
    if (loading[sym]) return   // already in-flight, don't double-load
    if (!symbols.includes(sym)) setSymbols(prev => [...prev, sym])
    setSelected(sym)
    setLoading(prev => ({ ...prev, [sym]: true }))
    setErrors(prev => { const n = { ...prev }; delete n[sym]; return n })
    try {
      const result = await fetchFundamentals(sym, apiKey)
      setDataMap(prev => ({ ...prev, [sym]: result }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [sym]: e.message }))
    }
    setLoading(prev => ({ ...prev, [sym]: false }))
  }, [apiKey, dataMap, symbols])

  const reload = useCallback(async (sym) => {
    setLoading(prev => ({ ...prev, [sym]: true }))
    setErrors(prev => { const n = { ...prev }; delete n[sym]; return n })
    try {
      const result = await fetchFundamentals(sym, apiKey)
      setDataMap(prev => ({ ...prev, [sym]: result }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [sym]: e.message }))
    }
    setLoading(prev => ({ ...prev, [sym]: false }))
  }, [apiKey])

  const clearAll = () => {
    setSymbols([])
    setDataMap({})
    setErrors({})
    setSelected(null)
  }

  const remove = (sym) => {
    setSymbols(prev => prev.filter(s => s !== sym))
    setDataMap(prev => { const n = { ...prev }; delete n[sym]; return n })
    if (selected === sym) setSelected(symbols.find(s => s !== sym) || null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    loadSymbol(input)
    setInput('')
  }

  const loadFinancials = useCallback(async (sym) => {
    setFinLoading(prev => ({ ...prev, [sym]: true }))
    try {
      const result = await fetchFinancials(sym)
      const existing = JSON.parse(localStorage.getItem(FIN_CACHE_KEY) || '{}')
      localStorage.setItem(FIN_CACHE_KEY, JSON.stringify({ ...existing, [sym]: result }))
      setFinLoaded(prev => ({ ...prev, [sym]: true }))
    } catch {}
    setFinLoading(prev => ({ ...prev, [sym]: false }))
  }, [])

  // Seed finLoaded from existing cache on mount
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(FIN_CACHE_KEY) || '{}')
      const loaded = {}
      for (const k of Object.keys(cached)) loaded[k] = true
      setFinLoaded(loaded)
    } catch {}
  }, [])

  if (!apiKey) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center space-y-3">
        <KeyRound size={28} className="text-slate-500 mx-auto" />
        <p className="text-slate-300 font-medium">Finnhub API Key Required</p>
        <p className="text-sm text-slate-500">Enter your free Finnhub key using the key icon in the header (Investments tab).</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sector browser */}
      <SectorBrowser
        onAdd={syms => { syms.forEach(s => loadSymbol(s)); setView('compare') }}
        onSendToOptimizer={onSendToOptimizer}
        onSendToRisk={onSendToRisk}
        loadedSymbols={symbols}
      />

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Ticker symbol e.g. AAPL"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
          />
        </div>
        <button type="submit" disabled={!input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Load
        </button>
      </form>

      {/* Loaded symbols chips */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {symbols.map(sym => (
            <div key={sym} className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg border text-sm font-semibold cursor-pointer transition-colors ${
              selected === sym
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'
            }`} onClick={() => setSelected(sym)}>
              {loading[sym] ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : errors[sym] ? (
                <AlertTriangle size={11} className="text-red-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-green-400" />
              )}
              {sym}
              {dataMap[sym]?.quote?.c && (
                <span className="text-xs font-normal opacity-70 ml-0.5">${dataMap[sym].quote.c.toFixed(2)}</span>
              )}
              <button onClick={e => { e.stopPropagation(); remove(sym) }}
                className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}

          {/* View toggle + clear */}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={clearAll}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Clear all
            </button>
          {symbols.length >= 2 && (
            <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setView('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'single' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                <LayoutList size={12} /> Single
              </button>
              <button onClick={() => setView('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'compare' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                <Columns size={12} /> Compare
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Error */}
      {selected && errors[selected] && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" /> {errors[selected]}
        </div>
      )}

      {/* Loading state */}
      {selected && loading[selected] && !dataMap[selected] && (
        <div className="text-center text-slate-500 py-16 text-sm animate-pulse">Loading {selected}…</div>
      )}

      {/* Content */}
      {symbols.length === 0 && (
        <div className="text-center text-slate-600 py-16 text-sm">
          Search for any stock ticker to get started.<br />
          Load multiple to compare side-by-side.
        </div>
      )}

      {view === 'single' && selected && dataMap[selected] && (
        <div>
          <div className="flex justify-end gap-2 mb-3">
            <button
              onClick={() => loadFinancials(selected)}
              disabled={finLoading[selected]}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              title="Fetch financials from SEC EDGAR for this symbol"
            >
              <DatabaseZap size={12} className={finLoading[selected] ? 'animate-pulse' : ''} />
              {finLoading[selected] ? 'Loading…' : finLoaded[selected] ? 'Financials ✓' : 'Load Financials'}
            </button>
            <button onClick={() => reload(selected)} disabled={loading[selected]}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
              <RefreshCw size={12} className={loading[selected] ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <SingleView sym={selected} d={dataMap[selected]} />
        </div>
      )}

      {view === 'compare' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <CompareView symbols={symbols} dataMap={dataMap} />
        </div>
      )}

      {/* Portfolio context — correlation + combined EF */}
      {symbols.length > 0 && investments.length > 0 && (
        <PortfolioContext investments={investments} loadedSymbols={symbols} dataMap={dataMap} cash={cash} efResearchParamsKey={efResearchParamsKey} />
      )}
    </div>
  )
}
