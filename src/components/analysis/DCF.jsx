import { useState, useMemo, useEffect, useRef } from 'react'
import { fetchFinancials } from '../../utils/fetchFinancials'
import { MOCK_FINANCIALS } from '../../utils/mockFinancials'
import { Search, Info, X, AlertTriangle, KeyRound, HelpCircle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'

const CACHE_KEY = 'bt_financials_cache'
const YEARS = 5

// ── Formatters ────────────────────────────────────────────────
const fmtB = v => {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v), s = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${s}$${(abs/1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${s}$${(abs/1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${s}$${(abs/1e6).toFixed(2)}M`
  return `${s}$${abs.toFixed(0)}`
}
const fmtPct = v => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtUSD = v => v == null ? '—' : `$${v.toFixed(2)}`

// ── Inline tooltip ────────────────────────────────────────────
function Tip({ text }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  return (
    <span className="relative inline-flex items-center ml-1" ref={ref}>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-slate-600 hover:text-slate-400 transition-colors align-middle"
        tabIndex={-1}
        type="button"
      >
        <HelpCircle size={11} />
      </button>
      {show && (
        <span className="fixed z-[9999] w-64 bg-slate-950 border border-slate-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 leading-relaxed shadow-2xl pointer-events-none"
          style={{
            top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 0,
            left: ref.current ? Math.min(ref.current.getBoundingClientRect().left - 8, window.innerWidth - 280) : 0,
          }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── DCF Math ──────────────────────────────────────────────────
function runDCF({ baseFCF, growthRate, terminalRate, discountRate, sharesOutstanding, netCash }) {
  if (!baseFCF || !sharesOutstanding) return null
  const r = discountRate / 100
  const g = growthRate / 100
  const gt = terminalRate / 100
  const projectedFCF = []
  let pv = 0
  for (let t = 1; t <= YEARS; t++) {
    const fcf = baseFCF * Math.pow(1 + g, t)
    const discounted = fcf / Math.pow(1 + r, t)
    projectedFCF.push({ year: `Yr ${t}`, fcf, discounted })
    pv += discounted
  }
  const fcfYear5 = baseFCF * Math.pow(1 + g, YEARS)
  const terminalValue = (fcfYear5 * (1 + gt)) / (r - gt)
  const pvTerminal = terminalValue / Math.pow(1 + r, YEARS)
  const totalEquityValue = pv + pvTerminal + (netCash || 0)
  const intrinsicValue = totalEquityValue / sharesOutstanding
  return { projectedFCF, pvFCF: pv, terminalValue, pvTerminal, totalEquityValue, intrinsicValue }
}

// ── Sensitivity Table ─────────────────────────────────────────
function SensitivityTable({ baseFCF, growthRate, terminalRate, sharesOutstanding, netCash, currentPrice }) {
  const discountRates = [7, 8, 9, 10, 11, 12]
  const growthRates   = [growthRate - 10, growthRate - 5, growthRate, growthRate + 5, growthRate + 10]
    .map(g => Math.max(-50, Math.min(100, g)))

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
      <div className="px-4 pt-3 pb-2 border-b border-slate-700">
        <div className="flex items-start gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sensitivity Analysis</p>
            <p className="text-xs text-slate-500 mt-0.5">
              How much the intrinsic value changes when you adjust your assumptions.
              Each cell shows the per-share value if you used <em>that</em> discount rate (row) and growth rate (column).
              {currentPrice && <span> Percentages show margin of safety vs current price <span className="text-slate-300 font-medium">{fmtUSD(currentPrice)}</span>.</span>}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Undervalued &gt;20%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Undervalued 0–20%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500 inline-block" /> Overvalued 0–20%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Overvalued &gt;20%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/40 border border-blue-500 inline-block" /> Your current assumptions</span>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="px-3 py-2 text-left text-slate-500 font-semibold">
              Discount ↓ / Growth →
              <Tip text="Discount rate (rows) is your required return. Growth rate (columns) is how fast FCF grows yr 1–5. The intersection is the intrinsic value under those assumptions." />
            </th>
            {growthRates.map(g => (
              <th key={g} className={`px-3 py-2 text-right font-semibold ${g === growthRate ? 'text-blue-400' : 'text-slate-500'}`}>
                {g > 0 ? '+' : ''}{g.toFixed(0)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {discountRates.map(dr => (
            <tr key={dr} className="border-b border-slate-700/40 hover:bg-slate-700/20">
              <td className={`px-3 py-2 font-semibold ${dr === 10 ? 'text-blue-400' : 'text-slate-400'}`}>{dr}%</td>
              {growthRates.map(gr => {
                const result = runDCF({ baseFCF, growthRate: gr, terminalRate, discountRate: dr, sharesOutstanding, netCash })
                const iv = result?.intrinsicValue
                const margin = currentPrice && iv ? ((iv - currentPrice) / currentPrice) * 100 : null
                const color = margin == null ? 'text-slate-500'
                  : margin > 20 ? 'text-green-400' : margin > 0 ? 'text-emerald-400'
                  : margin > -20 ? 'text-yellow-400' : 'text-red-400'
                const isBase = dr === 10 && gr === growthRate
                return (
                  <td key={gr} className={`px-3 py-2 text-right tabular-nums font-medium ${color} ${isBase ? 'bg-blue-500/10' : ''}`}>
                    {iv != null ? fmtUSD(iv) : '—'}
                    {margin != null && <span className="block text-[9px] opacity-70">{fmtPct(margin)}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-600 px-4 py-2 border-t border-slate-700">
        Tip: the wider the spread between cells, the more sensitive this stock's valuation is to your assumptions — treat those cases with extra caution.
      </p>
    </div>
  )
}

// ── Parse shorthand like "10B", "1.5M", "500K" ───────────────
function parseBig(str) {
  if (str == null) return null
  const s = String(str).trim().replace(/,/g, '')
  if (s === '' || s === '-') return null
  const neg = s.startsWith('-')
  const abs = neg ? s.slice(1) : s
  const m = abs.match(/^([\d.]+)\s*([kmbt]?)$/i)
  if (!m) return null
  let n = parseFloat(m[1])
  if (isNaN(n)) return null
  const suffix = m[2].toLowerCase()
  if (suffix === 'k') n *= 1e3
  else if (suffix === 'm') n *= 1e6
  else if (suffix === 'b') n *= 1e9
  else if (suffix === 't') n *= 1e12
  return neg ? -n : n
}

// ── Editable big-number input (supports 10B, 1.5M, etc.) ─────
function BigInput({ value, onChange, placeholder, className = '' }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const display = focused ? raw : (value != null ? fmtB(value).replace('$', '') : '')
  return (
    <input
      type="text"
      value={display}
      placeholder={placeholder}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { setRaw(value != null ? String(value) : ''); setFocused(true) }}
      onBlur={() => {
        setFocused(false)
        const parsed = parseBig(raw)
        if (parsed !== null) onChange(parsed)
      }}
      className={`bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-100 text-right focus:outline-none focus:border-blue-500 tabular-nums ${className}`}
    />
  )
}

// ── Slider row ────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step = 0.5, onChange, color = 'accent-blue-500', unit = '%', note, tip }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 flex items-center">
          {label}
          {tip && <Tip text={tip} />}
        </span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={focused ? raw : String(value)}
            onChange={e => setRaw(e.target.value)}
            onFocus={() => { setRaw(String(value)); setFocused(true) }}
            onBlur={() => {
              setFocused(false)
              const n = parseFloat(raw)
              if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
            }}
            className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-100 text-right focus:outline-none focus:border-blue-500 tabular-nums"
          />
          <span className="text-slate-500 text-xs">{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 ${color} cursor-pointer`} />
      {note && <p className="text-[10px] text-slate-600 mt-0.5">{note}</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function DCF({ investments }) {
  const [symbol,   setSymbol]   = useState('')
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [data,     setData]     = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  const [growthRate,         setGrowthRate]         = useState(10)
  const [terminalRate,       setTerminalRate]        = useState(3)
  const [discountRate,       setDiscountRate]        = useState(10)
  const [sharesInput,        setSharesInput]         = useState(null)
  const [currentPriceInput,  setCurrentPriceInput]   = useState(null)
  const [baseFCFOverride,    setBaseFCFOverride]     = useState(null)
  const [netCashOverride,    setNetCashOverride]     = useState(null)

  async function loadSymbol(sym) {
    const s = sym.trim().toUpperCase()
    if (!s) return
    setLoading(true); setError(null); setData(null)
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      if (cached[s]) { setData(cached[s]); setSymbol(s); setLoading(false); return }
    } catch {}
    if (s === 'MSFT') { setData(MOCK_FINANCIALS); setSymbol(s); setLoading(false); return }
    const apiKey = localStorage.getItem('bt_av_key') || ''
    if (!apiKey) { setError('no_key'); setLoading(false); return }
    try {
      const result = await fetchFinancials(s, apiKey)
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
        cached[s] = result
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      } catch {}
      setData(result); setSymbol(s)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const openSymbols = investments.filter(i => i.status === 'open').map(i => i.symbol)

  const derived = useMemo(() => {
    if (!data) return null
    const annual = data.annual || []
    if (annual.length === 0) return null
    const recentAnnual = [...annual].reverse().slice(0, 3)
    const validFCFs = recentAnnual.map(r => r.freeCF).filter(v => v != null)
    const baseFCF = validFCFs.length > 0 ? validFCFs.reduce((a, b) => a + b, 0) / validFCFs.length : null
    const latest = recentAnnual[0]
    const netCash = latest ? (latest.cashAndShortTerm ?? latest.cash ?? 0) - (latest.longTermDebt ?? 0) : 0
    const validForGrowth = [...annual].filter(r => r.freeCF != null && r.freeCF > 0)
    let impliedGrowth = null
    if (validForGrowth.length >= 2) {
      const oldest = validForGrowth[0].freeCF
      const newest = validForGrowth[validForGrowth.length - 1].freeCF
      impliedGrowth = (Math.pow(newest / oldest, 1 / (validForGrowth.length - 1)) - 1) * 100
    }
    const inv = investments.find(i => i.symbol === symbol && i.status === 'open')
    const currentPrice = parseFloat(inv?.currentPrice) || parseFloat(inv?.avgCost) || null
    return { baseFCF, netCash, impliedGrowth, currentPrice, annualData: recentAnnual, allAnnual: annual }
  }, [data, symbol, investments])

  useEffect(() => {
    if (derived?.impliedGrowth != null)
      setGrowthRate(Math.max(-30, Math.min(60, parseFloat(derived.impliedGrowth.toFixed(1)))))
    setSharesInput(null); setCurrentPriceInput(null)
    setBaseFCFOverride(null); setNetCashOverride(null)
  }, [symbol])

  const effectivePrice = currentPriceInput ?? derived?.currentPrice ?? null
  const fundamentalsCache = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('bt_fundamentals_cache') || '{}') } catch { return {} }
  }, [symbol])
  const sharesFromFundamentals = symbol === 'MSFT' && !fundamentalsCache['MSFT']?.profile?.shareOutstanding
    ? 7_430_000_000
    : fundamentalsCache[symbol]?.profile?.shareOutstanding
      ? fundamentalsCache[symbol].profile.shareOutstanding * 1e6 : null
  const effectiveShares = sharesInput ?? sharesFromFundamentals ?? null
  const effectiveBaseFCF = baseFCFOverride ?? derived?.baseFCF ?? null
  const effectiveNetCash = netCashOverride ?? derived?.netCash ?? 0

  const dcfResult = useMemo(() => {
    if (!effectiveBaseFCF || !effectiveShares) return null
    return runDCF({ baseFCF: effectiveBaseFCF, growthRate, terminalRate, discountRate, sharesOutstanding: effectiveShares, netCash: effectiveNetCash })
  }, [effectiveBaseFCF, effectiveNetCash, growthRate, terminalRate, discountRate, effectiveShares])

  const marginOfSafety = dcfResult && effectivePrice
    ? ((dcfResult.intrinsicValue - effectivePrice) / effectivePrice) * 100 : null

  const chartData = useMemo(() => {
    if (!derived?.allAnnual || !dcfResult) return []
    return [
      ...derived.allAnnual.map(r => ({ label: r.date.slice(0, 4), fcf: r.freeCF, type: 'historical' })),
      ...dcfResult.projectedFCF.map((p, i) => ({ label: `+${i + 1}yr`, fcf: p.fcf, type: 'projected' })),
    ]
  }, [derived, dcfResult])

  return (
    <div className="space-y-4">

      {/* ── Info modal ───────────────────────────────────────── */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h2 className="text-base font-semibold text-slate-100">Discounted Cash Flow — Full Guide</h2>
              <button onClick={() => setShowInfo(false)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-5 text-sm text-slate-300 leading-relaxed">

              <div>
                <h3 className="text-slate-100 font-semibold mb-1">What is a DCF?</h3>
                <p>A DCF answers the question: <em>"What is this company worth today, based on the cash it will generate in the future?"</em> A dollar of cash flow received 5 years from now is worth less than a dollar today — because you could invest that dollar right now and earn a return. DCF accounts for this by <strong className="text-white">discounting</strong> future cash flows back to present value.</p>
              </div>

              <div>
                <h3 className="text-slate-100 font-semibold mb-2">The Formula</h3>
                <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs space-y-1.5">
                  <p><span className="text-blue-400">FCF_t</span>  = BaseFCF × (1 + g)^t         <span className="text-slate-600 ml-2">// projected cash flow in year t</span></p>
                  <p><span className="text-blue-400">PV</span>     = Σ FCF_t / (1 + r)^t          <span className="text-slate-600 ml-2">// sum of discounted cash flows</span></p>
                  <p><span className="text-violet-400">TV</span>    = FCF_5 × (1 + gₜ) / (r − gₜ)  <span className="text-slate-600 ml-2">// terminal value (Gordon Growth)</span></p>
                  <p><span className="text-green-400">Value</span> = (PV + PV(TV) + NetCash) / Shares</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-100 font-semibold">Key Terms Explained</h3>

                <div className="bg-slate-900/60 rounded-lg p-3 space-y-2.5 text-xs">
                  <div>
                    <p className="text-slate-100 font-semibold">Free Cash Flow (FCF)</p>
                    <p className="text-slate-400 mt-0.5">The actual cash a company generates after paying for everything it needs to maintain and grow the business. <strong className="text-slate-200">FCF = Operating Cash Flow − Capital Expenditures.</strong> This is different from earnings/profit, which can be manipulated with accounting. Cash is harder to fake.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Base FCF (3-year average)</p>
                    <p className="text-slate-400 mt-0.5">We use the average of the last 3 years of FCF rather than just the most recent year. This smooths out one-time items like a big capital purchase that temporarily crushed FCF.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">FCF Growth Rate (Yr 1–5)</p>
                    <p className="text-slate-400 mt-0.5">How fast you expect FCF to grow each year for the next 5 years. Auto-set from the historical CAGR. <strong className="text-slate-200">This is the most impactful assumption</strong> — be conservative. High-growth companies today rarely sustain that growth rate forever.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Terminal Growth Rate</p>
                    <p className="text-slate-400 mt-0.5">After year 5, we assume the company grows forever at this rate (the <em>terminal rate</em>). Should be close to long-term GDP growth — typically <strong className="text-slate-200">2–3%</strong>. Using a higher number inflates the terminal value dramatically. Never use a terminal rate ≥ your discount rate — the math breaks.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Discount Rate (WACC)</p>
                    <p className="text-slate-400 mt-0.5">Your required rate of return — the minimum return you'd accept for taking on the risk of owning this stock. Often approximated as WACC (Weighted Average Cost of Capital). <strong className="text-slate-200">8% for stable large-caps, 10–12% for growth stocks, 12–15% for risky/small-caps.</strong> A higher discount rate = lower intrinsic value (future cash flows are worth less to you).</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Terminal Value (TV)</p>
                    <p className="text-slate-400 mt-0.5">The value of all cash flows <em>beyond</em> year 5, calculated using the Gordon Growth Model. For most companies, the terminal value makes up 60–80% of the total DCF value — which is why the terminal growth rate assumption matters so much.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Net Cash / Net Debt</p>
                    <p className="text-slate-400 mt-0.5"><strong className="text-green-400">Net Cash = Cash &amp; Investments − Long-term Debt.</strong> A company sitting on a pile of cash is worth more per share than one with heavy debt. This gets added directly to the equity value before dividing by shares outstanding.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Intrinsic Value per Share</p>
                    <p className="text-slate-400 mt-0.5">The total equity value (PV of FCFs + PV of terminal value + net cash) divided by shares outstanding. This is what the model says one share is <em>worth</em> — compare it to the current market price.</p>
                  </div>
                  <div>
                    <p className="text-slate-100 font-semibold">Margin of Safety</p>
                    <p className="text-slate-400 mt-0.5"><strong className="text-slate-200">(Intrinsic Value − Current Price) / Current Price.</strong> Positive = stock appears undervalued by that %. Negative = overvalued. Warren Buffett popularised buying at a large margin of safety (e.g. 30%+) to protect against errors in your assumptions.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-200/80">
                <p className="text-blue-300 font-semibold mb-1">How to use the Sensitivity Table</p>
                <p>Because DCF is highly sensitive to assumptions, never rely on a single number. The sensitivity table shows you the full range of outcomes. If most of the table is green (undervalued), you have a high-conviction buy. If half is red, the valuation is fragile — your thesis depends heavily on getting the growth rate right.</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-200/80">
                DCF is a tool for forming a view, not a precise prediction. All output depends entirely on the assumptions you put in. Not financial advice.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Discounted Cash Flow Valuation</h2>
          <p className="text-xs text-slate-600 mt-0.5">Estimate what a stock is intrinsically worth based on its future free cash flows</p>
        </div>
        <button onClick={() => setShowInfo(true)}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors">
          <Info size={13} /> Full guide
        </button>
      </div>

      {/* ── What is DCF callout (always visible) ─────────────── */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
        <span className="text-slate-200 font-semibold">How it works: </span>
        We project the company's Free Cash Flow (operating cash − capex) forward 5 years using your growth assumption, then estimate all future cash flows beyond that with a terminal value. Each year's cash flow is discounted back to today's dollars using your required rate of return. The sum, plus net cash on the balance sheet, divided by shares outstanding = intrinsic value per share.
        <button onClick={() => setShowInfo(true)} className="ml-1.5 text-blue-400 hover:text-blue-300 underline underline-offset-2">Read the full guide →</button>
      </div>

      {/* ── Symbol picker ─────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs text-slate-500 mb-2">Enter any ticker. Uses cached data from the Financials tab — no API call if already loaded. Try <span className="font-mono text-slate-300">MSFT</span> for demo data.</p>
        <form onSubmit={e => { e.preventDefault(); loadSymbol(input) }} className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Ticker e.g. AAPL"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
          <button type="submit" disabled={loading}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Search size={14} /> {loading ? 'Loading…' : 'Analyse'}
          </button>
        </form>
        {openSymbols.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider self-center">Quick pick:</span>
            {openSymbols.map(s => (
              <button key={s} onClick={() => { setInput(s); loadSymbol(s) }}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                  s === symbol ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Errors ───────────────────────────────────────────── */}
      {error === 'no_key' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <KeyRound size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200/80">
            Alpha Vantage API key required to fetch new symbols. Add it via the <span className="text-yellow-300 font-medium">key icon</span> in the header.
            If you've already viewed this stock in the <span className="text-yellow-300 font-medium">Financials tab</span>, it's already cached — no key needed.
          </div>
        </div>
      )}
      {error && error !== 'no_key' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      {data && derived && (
        <>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Assumptions panel ────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inputs & Assumptions</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Auto-populated from financial statements. Adjust to reflect your outlook.</p>
              </div>

              {/* Editable inputs */}
              <div className="space-y-2.5 text-xs border-b border-slate-700 pb-4">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center shrink-0">
                    Base FCF (3yr avg)
                    <Tip text="Free Cash Flow = Operating Cash Flow minus Capital Expenditures. We average the last 3 years to smooth out one-time items. Override if you want to use a different figure. Supports shorthand: 10B, 1.5M, 500K." />
                  </span>
                  <BigInput
                    value={effectiveBaseFCF}
                    onChange={setBaseFCFOverride}
                    placeholder="e.g. 10B"
                    className="w-24"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center shrink-0">
                    Net Cash / Debt
                    <Tip text="Cash & short-term investments minus long-term debt. Positive = net cash (adds to value). Negative = net debt (subtracts). Use negative numbers for net debt. Supports shorthand: -5B, 2.3B." />
                  </span>
                  <BigInput
                    value={effectiveNetCash}
                    onChange={setNetCashOverride}
                    placeholder="e.g. 2B or -5B"
                    className="w-24"
                  />
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex items-center shrink-0">
                    Shares Outstanding
                    <Tip text="Total shares issued by the company. Divide total equity value by this to get per-share price. Supports shorthand: 7.4B, 500M." />
                  </span>
                  <BigInput
                    value={effectiveShares}
                    onChange={setSharesInput}
                    placeholder={effectiveShares ? undefined : 'e.g. 7.4B'}
                    className={`w-24 ${!effectiveShares ? 'border-yellow-500/60' : ''}`}
                  />
                </div>
                {derived.impliedGrowth != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 flex items-center">
                      Historical FCF CAGR
                      <Tip text="Compound Annual Growth Rate of FCF over all available years. Used as the default growth rate assumption — but past growth doesn't guarantee future growth." />
                    </span>
                    <span className="font-medium text-blue-400 tabular-nums">{fmtPct(derived.impliedGrowth)}</span>
                  </div>
                )}
                {!effectiveShares && (
                  <p className="text-[10px] text-yellow-500/70">Enter shares outstanding above, or open this ticker in the Fundamentals tab to auto-populate.</p>
                )}
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                <SliderRow
                  label="FCF Growth Rate (Yr 1–5)" value={growthRate} min={-30} max={60}
                  onChange={setGrowthRate} color="accent-green-500"
                  tip="How fast you expect Free Cash Flow to grow each year for the next 5 years. This is auto-set from historical CAGR. Be conservative — most companies grow slower than their recent past suggests."
                  note={`At ${growthRate}%, Year 5 FCF = ${derived.baseFCF ? fmtB(derived.baseFCF * Math.pow(1 + growthRate/100, 5)) : '—'}`}
                />
                <SliderRow
                  label="Terminal Growth Rate" value={terminalRate} min={0} max={6} step={0.1}
                  onChange={setTerminalRate} color="accent-blue-500"
                  tip="The perpetual growth rate assumed after year 5 — forever. Should roughly equal long-term GDP growth (2–3%). A terminal rate close to or above your discount rate will produce unrealistically high values."
                  note="Keep ≤ 3% — above this inflates terminal value dramatically"
                />
                <SliderRow
                  label="Discount Rate (WACC)" value={discountRate} min={5} max={20} step={0.5}
                  onChange={setDiscountRate} color="accent-yellow-500"
                  tip="Your required rate of return — the minimum return you'd accept for the risk of owning this stock. Higher discount rate = lower intrinsic value. Use 8% for stable large-caps, 10–12% for growth stocks, 12%+ for risky names."
                  note="8–10% large-cap · 10–12% growth · 12–15% speculative"
                />
              </div>

              {/* Current price */}
              <div className="space-y-2 border-t border-slate-700 pt-3">
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-slate-500 flex items-center shrink-0">
                    Current Price
                    <Tip text="Used to calculate margin of safety. Auto-filled from your portfolio if this ticker is an open position. You can override it." />
                  </span>
                  <div className="flex items-center gap-1">
                    <BigInput
                      value={effectivePrice}
                      onChange={setCurrentPriceInput}
                      placeholder="e.g. 420.00"
                      className="w-20"
                    />
                    <span className="text-slate-500">$</span>
                  </div>
                </div>
                {!effectivePrice && (
                  <p className="text-[10px] text-slate-600">Enter a price to see margin of safety</p>
                )}
              </div>
            </div>

            {/* ── Results ──────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {dcfResult ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Valuation Result</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        PV of FCFs
                        <Tip text="Present Value of the next 5 years of projected Free Cash Flows, discounted back to today's dollars. This is what the near-term business is worth." />
                      </p>
                      <p className="text-sm font-bold text-blue-400 tabular-nums">{fmtB(dcfResult.pvFCF)}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        PV Terminal Value
                        <Tip text="Present Value of all cash flows beyond year 5, discounted to today. For most companies this is 60–80% of total value, which is why terminal rate assumptions matter so much." />
                      </p>
                      <p className="text-sm font-bold text-violet-400 tabular-nums">{fmtB(dcfResult.pvTerminal)}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        Intrinsic Value
                        <Tip text="What one share is worth according to this model: (PV of FCFs + PV Terminal Value + Net Cash) ÷ Shares Outstanding. Compare to the current market price." />
                      </p>
                      <p className="text-lg font-bold text-green-400 tabular-nums">{fmtUSD(dcfResult.intrinsicValue)}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                        Margin of Safety
                        <Tip text="(Intrinsic Value − Market Price) ÷ Market Price. Positive means the stock appears undervalued — you're buying a $1 of value for less than $1. A buffer against errors in your assumptions." />
                      </p>
                      {marginOfSafety != null ? (
                        <>
                          <p className={`text-lg font-bold tabular-nums ${marginOfSafety > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {marginOfSafety > 0 ? '+' : ''}{marginOfSafety.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {marginOfSafety > 30 ? 'Strong buy signal' : marginOfSafety > 10 ? 'Moderately undervalued' : marginOfSafety > -10 ? 'Fairly valued' : marginOfSafety > -30 ? 'Moderately overvalued' : 'Significantly overvalued'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">Enter a price above</p>
                      )}
                    </div>
                  </div>

                  {/* Value breakdown */}
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      Value Breakdown
                      <Tip text="What portion of the total intrinsic value comes from near-term FCFs (blue), terminal value (purple), and net cash on the balance sheet (green). A high terminal value % means the valuation is more speculative." />
                    </p>
                    <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                      {(() => {
                        const total = Math.max(dcfResult.pvFCF + dcfResult.pvTerminal + Math.max(0, derived.netCash), 1)
                        const pvPct = (dcfResult.pvFCF / total) * 100
                        const tvPct = (dcfResult.pvTerminal / total) * 100
                        const ncPct = (Math.max(0, derived.netCash) / total) * 100
                        return (<>
                          <div className="h-full bg-blue-500 rounded-l" style={{ width: `${pvPct}%` }} />
                          <div className="h-full bg-violet-500" style={{ width: `${tvPct}%` }} />
                          {ncPct > 0 && <div className="h-full bg-emerald-500 rounded-r" style={{ width: `${ncPct}%` }} />}
                        </>)
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5">
                      {[
                        ['#3b82f6', `PV FCFs (${((dcfResult.pvFCF / (dcfResult.pvFCF + dcfResult.pvTerminal)) * 100).toFixed(0)}%)`],
                        ['#8b5cf6', `Terminal Value (${((dcfResult.pvTerminal / (dcfResult.pvFCF + dcfResult.pvTerminal)) * 100).toFixed(0)}%)`],
                        ['#10b981', 'Net Cash'],
                      ].map(([c, l]) => (
                        <div key={l} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                          <span className="text-[10px] text-slate-500">{l}</span>
                        </div>
                      ))}
                    </div>
                    {dcfResult.pvTerminal / (dcfResult.pvFCF + dcfResult.pvTerminal) > 0.75 && (
                      <p className="text-[10px] text-yellow-400/80 mt-2">
                        ⚠ Over 75% of value comes from the terminal value — this valuation is highly sensitive to your terminal growth and discount rate assumptions.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center text-slate-500 text-sm">
                  {!effectiveShares ? 'Enter shares outstanding above to see the valuation.' : 'Insufficient FCF data to run DCF — company may have negative FCF history.'}
                </div>
              )}

              {/* FCF Chart */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Free Cash Flow — Historical + Projected</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Blue dots = actual reported FCF. Purple dots = model projections based on your growth rate assumption.</p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtB} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={62} />
                    <ReferenceLine y={0} stroke="#475569" />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      formatter={v => [fmtB(v), 'FCF']}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="fcf" stroke="#3b82f6" strokeWidth={2}
                      dot={({ cx, cy, payload }) => (
                        <circle key={cx} cx={cx} cy={cy} r={4}
                          fill={payload.type === 'projected' ? '#8b5cf6' : '#3b82f6'}
                          stroke="#1e293b" strokeWidth={1.5} />
                      )} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1">
                  {[['#3b82f6','Historical (actual)'],['#8b5cf6','Projected (model)']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                      <span className="text-xs text-slate-400">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Projected FCF table ───────────────────────────── */}
          {dcfResult && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
              <div className="px-4 pt-3 pb-2 border-b border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Year-by-Year Cash Flow Detail</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Projected FCF = what the model expects the company to generate. Discounted PV = what that cash is worth in today's dollars.
                  Notice how year 1 cash flows are discounted less than year 5 — money sooner is worth more.
                </p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">Year</th>
                    <th className="text-right px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">
                      Projected FCF
                      <Tip text="BaseFCF × (1 + growth)^year. This is the raw cash flow before discounting." />
                    </th>
                    <th className="text-right px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">
                      Discounted PV
                      <Tip text="Projected FCF ÷ (1 + discount rate)^year. This is what that future cash flow is worth today." />
                    </th>
                    <th className="text-right px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">% of PV FCFs</th>
                  </tr>
                </thead>
                <tbody>
                  {dcfResult.projectedFCF.map(({ year, fcf, discounted }) => (
                    <tr key={year} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 font-medium text-slate-300">{year}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-200">{fmtB(fcf)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-blue-400">{fmtB(discounted)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">
                        {((discounted / dcfResult.pvFCF) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-700/40 bg-violet-500/5">
                    <td className="px-4 py-2.5 font-medium text-violet-400 flex items-center gap-1">
                      Terminal Value
                      <Tip text="All cash flows beyond year 5, modelled as a perpetuity growing at the terminal rate. Calculated as: FCF_5 × (1 + terminal rate) ÷ (discount rate − terminal rate). This typically dominates the total value." />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{fmtB(dcfResult.terminalValue)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-violet-400">{fmtB(dcfResult.pvTerminal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">
                      {((dcfResult.pvTerminal / (dcfResult.pvFCF + dcfResult.pvTerminal)) * 100).toFixed(1)}% of total
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* ── Sensitivity table ─────────────────────────────── */}
          {dcfResult && (
            <SensitivityTable
              baseFCF={effectiveBaseFCF}
              growthRate={growthRate}
              terminalRate={terminalRate}
              sharesOutstanding={effectiveShares}
              netCash={effectiveNetCash}
              currentPrice={effectivePrice}
            />
          )}

          <p className="text-xs text-slate-600 text-center">
            Financial data from Alpha Vantage · 3-year average FCF · All projections are estimates based on your assumptions · Not financial advice
          </p>
        </>
      )}
    </div>
  )
}
