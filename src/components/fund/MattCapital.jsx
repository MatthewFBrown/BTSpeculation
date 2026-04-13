import { useState, useEffect, useMemo, useRef } from "react";
import { RefreshCw, HelpCircle, Calculator } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts';

/* ─── Strike calculator helpers (self-contained) ─────────────────── */
function parseNum(v) {
  if (!v || v === '--' || v === '-') return null
  const n = parseFloat(String(v).replace('%', ''))
  return isNaN(n) ? null : n
}

function parseChain(raw) {
  const lines = raw.trim().split('\n')
  let lastPrice = null
  const rows = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const priceMatch = trimmed.match(/Last\s*Price[:\s]+([0-9.]+)/i)
    if (priceMatch) { lastPrice = parseFloat(priceMatch[1]); continue }
    const cols = trimmed.split('\t')
    if (cols.length < 13) continue
    const strike = parseNum(cols[6])
    if (strike === null) continue
    rows.push({
      call: { last: parseNum(cols[0]), delta: parseNum(cols[1]), bid: parseNum(cols[2]), ask: parseNum(cols[3]), vol: parseNum(cols[4]), iv: parseNum(cols[5]) },
      strike,
      put:  { iv: parseNum(cols[7]), vol: parseNum(cols[8]), bid: parseNum(cols[9]), ask: parseNum(cols[10]), delta: parseNum(cols[11]), last: parseNum(cols[12]) },
    })
  }
  return { lastPrice, rows }
}

function scoreStrikes(rows, isCSP, lastPrice, dte) {
  if (!lastPrice || !dte) return []
  const candidates = rows.filter(row => {
    const side = isCSP ? row.put : row.call
    const delta = Math.abs(side.delta ?? 0)
    const mid = side.bid != null && side.ask != null ? (side.bid + side.ask) / 2 : (side.last ?? 0)
    return (isCSP ? row.strike < lastPrice : row.strike > lastPrice) && delta > 0 && mid > 0
  })
  if (candidates.length === 0) return []
  const scored = candidates.map(row => {
    const side = isCSP ? row.put : row.call
    const delta = Math.abs(side.delta ?? 0)
    const mid = side.bid != null && side.ask != null ? (side.bid + side.ask) / 2 : (side.last ?? 0)
    const spread = side.bid != null && side.ask != null && mid > 0 ? (side.ask - side.bid) / mid : 0.5
    const capital = isCSP ? row.strike * 100 : lastPrice * 100
    const annRet = capital > 0 ? (mid * 100 / capital) * (365 / dte) * 100 : 0
    const otmPct = Math.abs(row.strike - lastPrice) / lastPrice * 100
    const breakEven = isCSP ? row.strike - mid : row.strike + mid
    const bePct = Math.abs(breakEven - lastPrice) / lastPrice * 100
    const deltaScore = Math.max(0, 100 - Math.abs(delta - 0.27) * 300)
    const retScore = Math.min(100, annRet * 2.5)
    const spreadScore = Math.max(0, 100 - spread * 200)
    const volScore = side.vol ? Math.min(100, side.vol * 2) : 20
    const composite = retScore * 0.40 + deltaScore * 0.35 + spreadScore * 0.15 + volScore * 0.10
    let profile, profileColor
    if (delta >= 0.40)      { profile = 'Aggressive';   profileColor = 'text-red-400 bg-red-500/10 border-red-500/20' }
    else if (delta >= 0.28) { profile = 'Balanced';     profileColor = 'text-green-400 bg-green-500/10 border-green-500/20' }
    else if (delta >= 0.15) { profile = 'Conservative'; profileColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    else                    { profile = 'Far OTM';      profileColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
    return { row, delta, mid, spread, annRet, otmPct, bePct, capital, composite, profile, profileColor, side }
  })
  return scored.sort((a, b) => b.composite - a.composite)
}

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
      <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-300 transition-colors align-middle" type="button">
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

function ResultCard({ label, value, color = 'text-slate-100', sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  )
}

function fmtCalc(n) {
  return n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function StrikeCalculator() {
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [chainView, setChainView] = useState('analysis')
  const [calc, setCalc] = useState({ stockPrice: '', type: 'csp', strike: '', premium: '', contracts: '1', dte: '30' })
  function set(field, value) { setCalc(prev => ({ ...prev, [field]: value })) }

  const chain     = useMemo(() => pasteText ? parseChain(pasteText) : { lastPrice: null, rows: [] }, [pasteText])
  const price     = parseFloat(calc.stockPrice) || chain.lastPrice || 0
  const strike    = parseFloat(calc.strike) || 0
  const premium   = parseFloat(calc.premium) || 0
  const contracts = parseInt(calc.contracts) || 1
  const dte       = parseInt(calc.dte) || 30
  const isCSP     = calc.type === 'csp'

  const scored = useMemo(() => scoreStrikes(chain.rows, isCSP, chain.lastPrice || price, dte), [chain, isCSP, price, dte])

  const totalPremium  = premium * contracts * 100
  const capitalNeeded = isCSP ? strike * contracts * 100 : price * contracts * 100
  const breakEven     = isCSP ? strike - premium : strike + premium
  const maxProfit     = totalPremium
  const annReturn     = capitalNeeded > 0 && dte > 0 ? (totalPremium / capitalNeeded) * (365 / dte) * 100 : 0
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
            <button onClick={() => setShowPaste(!showPaste)} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              {showPaste ? 'Hide' : chain.rows.length > 0 ? 'Edit' : 'Paste Chain'}
            </button>
          </div>
        </div>

        {showPaste && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Paste your options chain from your broker (tab-separated). Calls on left, strike in middle, puts on right.</p>
            <textarea rows={6} className={`${inputCls} font-mono text-xs`}
              placeholder={'Call Last\tDelta\tBid\tAsk\tVol\tIV\tSTRIKE\tIV\tVol\tBid\tAsk\tDelta\tPut Last\n2.32\t0.611\t2.25\t3.00\t27\t58.12%\t50\t54.92%\t220\t1.15\t1.30\t-0.385\t1.15\nLast Price: 50.97'}
              value={pasteText} onChange={e => setPasteText(e.target.value)} />
            {pasteText && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500">{chain.rows.length} strikes parsed</span>
                <button onClick={() => { setPasteText(''); set('strike', ''); set('premium', '') }} className="text-xs text-red-400 hover:text-red-300 ml-auto">Clear</button>
              </div>
            )}
          </div>
        )}

        {chain.rows.length > 0 && chainView === 'analysis' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => set('type', 'csp')} className={`px-3 py-1.5 rounded text-xs font-medium ${isCSP ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>CSP</button>
              <button onClick={() => set('type', 'cc')}  className={`px-3 py-1.5 rounded text-xs font-medium ${!isCSP ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Covered Call</button>
              <span className="text-xs text-slate-500 self-center ml-2">DTE for ann. return:</span>
              <input type="number" min="1" className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500" value={calc.dte} onChange={e => set('dte', e.target.value)} />
            </div>
            {scored.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No scoreable OTM strikes found. Make sure "Last Price" is in your pasted data.</p>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    Top Picks — {isCSP ? 'Cash-Secured Put' : 'Covered Call'}
                    <InfoTip>
                      <p className="font-semibold mb-1">How strikes are scored</p>
                      <p className="mb-1">Each OTM strike gets a 0–100 composite score:</p>
                      <ul className="space-y-1 mb-2">
                        <li><span className="text-blue-300">40%</span> — Annualized return</li>
                        <li><span className="text-blue-300">35%</span> — Delta fit (sweet spot ~0.27)</li>
                        <li><span className="text-blue-300">15%</span> — Spread tightness</li>
                        <li><span className="text-blue-300">10%</span> — Volume</li>
                      </ul>
                    </InfoTip>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {scored.slice(0, 3).map((s, i) => {
                      const labels = ['Best Overall', 'Runner-up', 'Alternative']
                      return (
                        <button key={s.row.strike} onClick={() => selectStrike(s.row)}
                          className="text-left bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 rounded-xl p-3 transition-colors group">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{labels[i]}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}>{s.profile}</span>
                          </div>
                          <div className="text-xl font-bold text-slate-100 font-mono">${s.row.strike.toFixed(s.row.strike % 1 ? 2 : 0)}</div>
                          <div className="mt-1 space-y-0.5">
                            {[['Mid premium', `$${s.mid.toFixed(2)}`, 'text-green-400'], ['Ann. return', `${s.annRet.toFixed(1)}%`, 'text-blue-400'], ['Delta', s.delta.toFixed(2), 'text-slate-300'], ['% OTM', `${s.otmPct.toFixed(1)}%`, 'text-slate-300'], ['Break-even', `${s.bePct.toFixed(1)}% cushion`, 'text-slate-300']].map(([lbl, val, col]) => (
                              <div key={lbl} className="flex justify-between text-xs">
                                <span className="text-slate-500">{lbl}</span>
                                <span className={`font-mono ${col}`}>{val}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-blue-400 group-hover:text-blue-300 mt-2">Click to load →</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">All OTM Strikes — Ranked</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['#', 'Strike', 'Mid', 'Delta', '% OTM', 'Ann. Return', 'BE Cushion', 'IV', 'Profile'].map(h => (
                            <th key={h} className={`py-1.5 px-2 text-slate-500 font-medium ${h === '#' || h === 'Profile' ? 'text-left' : 'text-right'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scored.map((s, i) => {
                          const iv = isCSP ? s.row.put.iv : s.row.call.iv
                          return (
                            <tr key={s.row.strike} onClick={() => selectStrike(s.row)}
                              className={`border-b border-slate-800/50 cursor-pointer transition-colors ${strike === s.row.strike ? 'bg-blue-500/15' : i < 3 ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-slate-700/20'}`}>
                              <td className="py-1.5 px-2 text-slate-500 font-medium">{i === 0 ? '★' : i + 1}</td>
                              <td className="py-1.5 px-2 text-right text-slate-200 font-mono font-semibold">${s.row.strike.toFixed(s.row.strike % 1 ? 2 : 0)}</td>
                              <td className="py-1.5 px-2 text-right text-green-400 font-mono">${s.mid.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-300 font-mono">{s.delta.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right text-slate-400">{s.otmPct.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-blue-400 font-semibold">{s.annRet.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-slate-400">{s.bePct.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right text-slate-500">{iv != null ? iv.toFixed(1) + '%' : '--'}</td>
                              <td className="py-1.5 px-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}>{s.profile}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">Score: 40% ann. return · 35% delta (sweet spot ~0.27) · 15% spread · 10% volume. Click any row to load.</p>
                </div>
              </>
            )}
          </div>
        )}

        {chain.rows.length > 0 && chainView === 'chain' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th colSpan={5} className="text-center py-1.5 text-amber-400 font-semibold text-[10px] uppercase tracking-wider">Calls</th>
                  <th className="py-1.5"></th>
                  <th colSpan={5} className="text-center py-1.5 text-purple-400 font-semibold text-[10px] uppercase tracking-wider">Puts</th>
                </tr>
                <tr className="border-b border-slate-700">
                  {['Delta','Bid','Ask','Vol','IV','Strike','IV','Bid','Ask','Delta','Vol'].map((h,i) => (
                    <th key={i} className={`py-1.5 px-1.5 text-slate-500 font-medium ${i === 5 ? 'text-center text-slate-300 font-bold' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chain.rows.map(row => {
                  const isATM = chain.lastPrice && Math.abs(row.strike - chain.lastPrice) === Math.min(...chain.rows.map(r => Math.abs(r.strike - chain.lastPrice)))
                  const putOTM = chain.lastPrice ? row.strike < chain.lastPrice : false
                  const callOTM = chain.lastPrice ? row.strike > chain.lastPrice : false
                  return (
                    <tr key={row.strike} onClick={() => selectStrike(row)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors ${strike === row.strike ? 'bg-blue-500/15' : isATM ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-amber-300'}`}>{row.call.delta?.toFixed(3) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.call.bid?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? 'text-slate-500' : 'text-slate-300'}`}>{row.call.ask?.toFixed(2) ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${callOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.call.vol ?? '--'}</td>
                      <td className={`py-1.5 px-1.5 text-right ${callOTM ? 'text-slate-600' : 'text-slate-400'}`}>{row.call.iv != null ? row.call.iv.toFixed(1) + '%' : '--'}</td>
                      <td className={`py-1.5 px-2 text-center font-bold font-mono ${isATM ? 'text-blue-400' : 'text-slate-200'}`}>
                        {row.strike.toFixed(row.strike % 1 ? 2 : 0)}{isATM && <span className="text-[9px] text-blue-500 ml-1">ATM</span>}
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
        <div className="flex gap-2 mb-4">
          <button onClick={() => set('type', 'csp')} className={`px-4 py-1.5 rounded text-sm font-medium ${isCSP ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Cash-Secured Put</button>
          <button onClick={() => set('type', 'cc')}  className={`px-4 py-1.5 rounded text-sm font-medium ${!isCSP ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Covered Call</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div><label className={labelCls}>Stock Price</label><input type="number" step="0.01" className={inputCls} placeholder={chain.lastPrice ? String(chain.lastPrice) : '150.00'} value={calc.stockPrice} onChange={e => set('stockPrice', e.target.value)} /></div>
          <div><label className={labelCls}>Strike</label><input type="number" step="0.01" className={inputCls} placeholder="145.00" value={calc.strike} onChange={e => set('strike', e.target.value)} /></div>
          <div><label className={labelCls}>Premium (per share)</label><input type="number" step="0.01" className={inputCls} placeholder="2.50" value={calc.premium} onChange={e => set('premium', e.target.value)} /></div>
          <div><label className={labelCls}>Contracts</label><input type="number" min="1" className={inputCls} placeholder="1" value={calc.contracts} onChange={e => set('contracts', e.target.value)} /></div>
          <div><label className={labelCls}>DTE (days)</label><input type="number" min="1" className={inputCls} placeholder="30" value={calc.dte} onChange={e => set('dte', e.target.value)} /></div>
        </div>
        {strike > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <ResultCard label="% OTM" value={`${otmPercent.toFixed(1)}%`} sub={price > 0 ? `$${Math.abs(strike - price).toFixed(2)} from price` : ''} />
            <ResultCard label="Break-Even" value={`$${breakEven.toFixed(2)}`} sub={`${isCSP ? '-' : '+'}$${premium.toFixed(2)} from strike`} />
            <ResultCard label="Max Profit" value={fmtCalc(maxProfit)} color="text-green-400" />
            <ResultCard label="Capital Required" value={fmtCalc(capitalNeeded)} />
            <ResultCard label="Premium Yield" value={`${premiumYield.toFixed(2)}%`} sub={`for ${dte} days`} />
            <ResultCard label="Annualized Return" value={`${annReturn.toFixed(1)}%`} color="text-blue-400" />
          </div>
        )}
      </div>
    </div>
  )
}

async function fetchPrice(symbol, apiKey) {
    const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.c || null;
}

const fmt$ = (n) =>
    n == null || isNaN(n)
        ? "—"
        : n.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
          });

const fmtPct = (n) =>
    n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function daysToExpiry(expiryStr) {
    return Math.max(
        0,
        Math.ceil((new Date(expiryStr) - new Date()) / 86400000),
    );
}

function daysBetween(a, b) {
    return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function fmtAnn(n) {
    if (n == null || isNaN(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function MattCapital() {
    const apiKey = localStorage.getItem("bt_finnhub_key") || "";
    const [fundData, setFundData] = useState(null);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [dataError, setDataError] = useState(null);
    const [tab, setTab] = useState('portfolio');
    const [chartMode, setChartMode] = useState({});
    const [demoMode, setDemoMode] = useState(false);

    // Load JSON data file
    useEffect(() => {
        const file = demoMode ? "/temp.json" : "/mattcapital.json";
        setFundData(null);
        setDataError(null);
        fetch(file)
            .then((r) => r.json())
            .then(setFundData)
            .catch(() => setDataError(`Could not load ${file}`));
    }, [demoMode]);

    async function loadPrices(data) {
        const src = data || fundData;
        if (!src || !apiKey) return;
        setLoading(true);
        const tickers = [
            ...new Set([
                ...src.stockPositions.map((p) => p.ticker),
                ...src.wheelPositions.map((p) => p.ticker),
            ]),
        ];
        const result = {};
        for (const sym of tickers) {
            const price = await fetchPrice(sym, apiKey);
            if (price) result[sym] = price;
            await new Promise((r) => setTimeout(r, 150));
        }
        setPrices(result);
        setLoading(false);
    }

    useEffect(() => {
        if (fundData) loadPrices(fundData);
    }, [fundData]); // eslint-disable-line

    if (dataError)
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
                {dataError}
            </div>
        );
    if (!fundData)
        return (
            <div className="text-center text-slate-500 py-16 text-sm animate-pulse">
                Loading fund data…
            </div>
        );

    const { wheelPositions, stockPositions, tradeLog, cash = 0, startDate } = fundData;

    // ── Derived stats ──────────────────────────────────────────────
    const stockValue = stockPositions.reduce(
        (s, p) => s + (prices[p.ticker] ?? p.entryPrice) * p.shares,
        0,
    );

    const premiumCollected = wheelPositions.reduce(
        (s, p) => s + p.premium * p.contracts * 100,
        0,
    );
    const closedPnl = tradeLog.reduce((s, t) => s + t.pnl, 0);

    // Unrealized P&L for wheel positions = total premium collected (value of positions)
    const wheelUnrealizedPnl = premiumCollected;

    const totalValue = stockValue + premiumCollected + cash;


    const wins = tradeLog.filter((t) => t.result === "win").length;
    const winRate = tradeLog.length > 0 ? (wins / tradeLog.length) * 100 : 0;

    // Annual return per closed trade
    const tradeAnnReturns = tradeLog
        .filter((t) => t.capital > 0)
        .map(
            (t) =>
                (t.pnl / t.capital) *
                (365 / daysBetween(t.entry, t.exit)) *
                100,
        );

    // Annual return per active wheel position — fixed to entry→expiry duration
    const wheelAnnReturns = wheelPositions
        .map((p) => {
            const duration = p.entry
                ? Math.max(1, daysBetween(p.entry, p.expiry))
                : null;
            return duration
                ? (p.premium / p.strike) * (365 / duration) * 100
                : null;
        })
        .filter(Boolean);

    // Portfolio annualised return — average across all positions with known capital
    const allAnnReturns = [...tradeAnnReturns, ...wheelAnnReturns];
    const portfolioAnnReturn =
        allAnnReturns.length > 0
            ? allAnnReturns.reduce((s, r) => s + r, 0) / allAnnReturns.length
            : null;

    // Actual return since startDate — total P&L vs starting capital (totalValue - closedPnl)
    const daysSinceStart = startDate ? daysBetween(startDate, new Date().toISOString().slice(0, 10)) : null;
    const startingCapital = totalValue - closedPnl;
    const actualReturnPct = startingCapital > 0 && closedPnl !== 0 ? (closedPnl / startingCapital) * 100 : null;
    const actualAnnPct = actualReturnPct != null && daysSinceStart > 0 ? actualReturnPct * (365 / daysSinceStart) : null;
    const startDateLabel = startDate ? new Date(startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

    return (
        <div className="space-y-6">
            {/* Fund Header */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                            MATT Capital
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Wheel strategy · Options · Equities
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDemoMode(d => !d)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ring-1 transition-colors ${
                                demoMode
                                    ? 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
                                    : 'bg-white/[0.05] text-slate-400 ring-white/10 hover:text-slate-200'
                            }`}
                        >
                            {demoMode ? 'Demo' : 'Live'}
                        </button>
                        <button
                            onClick={() => loadPrices()}
                            disabled={loading || !apiKey}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                        >
                            <RefreshCw
                                size={12}
                                className={loading ? "animate-spin" : ""}
                            />
                            {loading ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
                    {[
                        {
                            label: "Portfolio Value",
                            value: fmt$(totalValue),
                            color: "text-slate-100",
                        },
                        {
                            label: "Cash",
                            value: fmt$(cash),
                            color: "text-slate-300",
                        },
                        {
                            label: "Unrealized P&L",
                            value: fmt$(wheelUnrealizedPnl),
                            color: wheelUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400",
                        },
                        {
                            label: "Realized P&L",
                            value: fmt$(closedPnl),
                            color: closedPnl >= 0 ? "text-emerald-400" : "text-red-400",
                        },
                        {
                            label: startDateLabel ? `Return since ${startDateLabel}` : "Total Return",
                            value: actualReturnPct != null ? fmtAnn(actualReturnPct) : "—",
                            color: actualReturnPct == null ? "text-slate-400" : actualReturnPct >= 0 ? "text-emerald-400" : "text-red-400",
                        },
                        {
                            label: "Ann. Return (Actual)",
                            value: actualAnnPct != null ? fmtAnn(actualAnnPct) : "—",
                            color: actualAnnPct == null ? "text-slate-400" : actualAnnPct >= 0 ? "text-emerald-400" : "text-red-400",
                        },
                        {
                            label: "AVG Ann. Return",
                            value: fmtAnn(portfolioAnnReturn),
                            color: portfolioAnnReturn == null ? "text-slate-400" : portfolioAnnReturn >= 0 ? "text-emerald-400" : "text-red-400",
                        },
                        {
                            label: "Win Rate",
                            value: tradeLog.length > 0 ? `${winRate.toFixed(0)}%` : "—",
                            color: "text-blue-400",
                        },
                    ].map(({ label, value, color }) => (
                        <div key={label}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                {label}
                            </p>
                            <p
                                className={`text-xl font-bold tabular-nums ${color}`}
                            >
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit ring-1 ring-white/[0.06]">
                {[['portfolio', 'Portfolio'], ['statistics', 'Statistics'], ['strikes', 'Strike Calculator']].map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            tab === id
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'portfolio' && <>
            {/* Wheel Positions */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Active Wheel Positions
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Type",
                                    "Stock Price",
                                    "Strike",
                                    "DTE",
                                    "Expiry",
                                    "Contracts",
                                    "Premium",
                                    "Value",
                                    "Ann. Return",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {wheelPositions.map((p, i) => {
                                const dte = daysToExpiry(p.expiry);
                                const value = p.premium * p.contracts * 100;
                                return (
                                    <tr
                                        key={i}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-3 font-bold text-slate-100">
                                            {p.ticker}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.type === "CSP" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}
                                            >
                                                {p.type}
                                            </span>
                                        </td>
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${
                                                prices[p.ticker] == null
                                                    ? "text-slate-400"
                                                    : p.type === "CSP"
                                                      ? prices[p.ticker] >=
                                                        p.strike
                                                          ? "text-emerald-400"
                                                          : "text-red-400"
                                                      : prices[p.ticker] <=
                                                          p.strike
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                            }`}
                                        >
                                            {prices[p.ticker]
                                                ? fmt$(prices[p.ticker])
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {fmt$(p.strike)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 font-semibold tabular-nums ${dte <= 7 ? "text-red-400" : dte <= 21 ? "text-yellow-400" : "text-slate-300"}`}
                                        >
                                            {dte}d
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {p.expiry}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-300">
                                            {p.contracts}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-emerald-400">
                                            {fmt$(p.premium)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                                            {fmt$(value)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-blue-400">
                                            {(() => {
                                                const duration = p.entry ? Math.max(1, daysBetween(p.entry, p.expiry)) : null
                                                const ann = duration ? (p.premium / p.strike) * (365 / duration) * 100 : null
                                                return fmtAnn(ann)
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock Positions */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stock Positions
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Shares",
                                    "Entry Price",
                                    "Current Price",
                                    "Market Value",
                                    "P&L $",
                                    "P&L %",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stockPositions.map((p, i) => {
                                const current = prices[p.ticker] ?? null;
                                const mktValue =
                                    current != null ? current * p.shares : null;
                                const pnlD =
                                    current != null
                                        ? (current - p.entryPrice) * p.shares
                                        : null;
                                const pnlPct =
                                    current != null
                                        ? ((current - p.entryPrice) /
                                              p.entryPrice) *
                                          100
                                        : null;
                                const color =
                                    pnlD == null
                                        ? "text-slate-400"
                                        : pnlD >= 0
                                          ? "text-emerald-400"
                                          : "text-red-400";
                                return (
                                    <tr
                                        key={i}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-3 font-bold text-slate-100">
                                            {p.ticker}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-300">
                                            {p.shares.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400">
                                            {fmt$(p.entryPrice)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {current ? fmt$(current) : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {mktValue != null
                                                ? fmt$(mktValue)
                                                : "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                        >
                                            {pnlD != null ? fmt$(pnlD) : "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                        >
                                            {pnlPct != null
                                                ? fmtPct(pnlPct)
                                                : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trade Log */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Trade Log
                    </p>
                    <div className="flex gap-3 text-xs">
                        <span className="text-slate-400">
                            {tradeLog.length} trades ·{" "}
                            <span className="text-emerald-400">{wins}W</span>
                            {" / "}
                            <span className="text-red-400">
                                {
                                    tradeLog.filter((t) => t.result === "loss")
                                        .length
                                }
                                L
                            </span>
                        </span>
                        <span
                            className={`font-semibold ${closedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                            {fmt$(closedPnl)}
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Strategy",
                                    "Entry",
                                    "Exit",
                                    "P&L",
                                    "Ann. Return",
                                    "Result",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...tradeLog].reverse().map((t, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                >
                                    <td className="px-4 py-3 font-bold text-slate-100">
                                        {t.ticker}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">
                                        {t.strategy}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {t.entry}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {t.exit}
                                    </td>
                                    <td
                                        className={`px-4 py-3 tabular-nums font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                    >
                                        {fmt$(t.pnl)}
                                    </td>
                                    <td
                                        className={`px-4 py-3 tabular-nums font-semibold ${(() => {
                                            const ann =
                                                t.capital > 0
                                                    ? (t.pnl / t.capital) *
                                                      (365 /
                                                          daysBetween(
                                                              t.entry,
                                                              t.exit,
                                                          )) *
                                                      100
                                                    : null;
                                            return ann == null
                                                ? "text-slate-500"
                                                : ann >= 0
                                                  ? "text-blue-400"
                                                  : "text-red-400";
                                        })()}`}
                                    >
                                        {(() => {
                                            const ann =
                                                t.capital > 0
                                                    ? (t.pnl / t.capital) *
                                                      (365 /
                                                          daysBetween(
                                                              t.entry,
                                                              t.exit,
                                                          )) *
                                                      100
                                                    : null;
                                            return fmtAnn(ann);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                t.result === "win"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : t.result === "loss"
                                                      ? "bg-red-500/20 text-red-400"
                                                      : "bg-slate-600/40 text-slate-400"
                                            }`}
                                        >
                                            {t.result.charAt(0).toUpperCase() +
                                                t.result.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </>}

            {tab === 'statistics' && tradeLog.length > 0 && (() => {
                // Pre-compute per-trade stats
                const trades = tradeLog.map(t => {
                    const dur = daysBetween(t.entry, t.exit);
                    const ann = t.capital > 0 ? (t.pnl / t.capital) * (365 / dur) * 100 : null;
                    return { ...t, dur, ann };
                });

                const wins = trades.filter(t => t.result === 'win');
                const losses = trades.filter(t => t.result === 'loss');
                const totalWinAmt = wins.reduce((s, t) => s + t.pnl, 0);
                const totalLossAmt = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
                const profitFactor = totalLossAmt > 0 ? totalWinAmt / totalLossAmt : null;
                const avgWin = wins.length ? totalWinAmt / wins.length : null;
                const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : null;
                const bestTrade = trades.reduce((b, t) => t.pnl > b.pnl ? t : b, trades[0]);
                const worstTrade = trades.reduce((b, t) => t.pnl < b.pnl ? t : b, trades[0]);
                const avgDur = Math.round(trades.reduce((s, t) => s + t.dur, 0) / trades.length);
                // Current streak
                const sorted = [...trades].sort((a, b) => new Date(b.exit) - new Date(a.exit));
                let streak = 0;
                const streakType = sorted[0]?.result;
                for (const t of sorted) {
                    if (t.result === streakType) streak++;
                    else break;
                }

                // DTE buckets
                const buckets = [
                    { label: '0–7 DTE', min: 0, max: 7 },
                    { label: '8–14 DTE', min: 8, max: 14 },
                    { label: '15–21 DTE', min: 15, max: 21 },
                    { label: '22+ DTE', min: 22, max: Infinity },
                ];
                const dteBuckets = buckets.map(b => {
                    const group = trades.filter(t => t.dur >= b.min && t.dur <= b.max);
                    const gWins = group.filter(t => t.result === 'win');
                    const anns = group.filter(t => t.ann != null).map(t => t.ann);
                    return {
                        label: b.label,
                        count: group.length,
                        winRate: group.length ? (gWins.length / group.length) * 100 : null,
                        avgPnl: group.length ? group.reduce((s, t) => s + t.pnl, 0) / group.length : null,
                        totalPnl: group.reduce((s, t) => s + t.pnl, 0),
                        avgAnn: anns.length ? anns.reduce((a, b) => a + b, 0) / anns.length : null,
                    };
                }).filter(b => b.count > 0);

                // Per-strategy
                const strategies = [...new Set(trades.map(t => t.strategy))];
                const stratStats = strategies.map(s => {
                    const group = trades.filter(t => t.strategy === s);
                    const gWins = group.filter(t => t.result === 'win');
                    const anns = group.filter(t => t.ann != null).map(t => t.ann);
                    return {
                        strategy: s,
                        count: group.length,
                        winRate: group.length ? (gWins.length / group.length) * 100 : null,
                        avgPnl: group.length ? group.reduce((s2, t) => s2 + t.pnl, 0) / group.length : null,
                        totalPnl: group.reduce((s2, t) => s2 + t.pnl, 0),
                        avgAnn: anns.length ? anns.reduce((a, b) => a + b, 0) / anns.length : null,
                    };
                });

                // Per-ticker
                const tickers = [...new Set(trades.map(t => t.ticker))];
                const tickerStats = tickers.map(tk => {
                    const group = trades.filter(t => t.ticker === tk);
                    const gWins = group.filter(t => t.result === 'win');
                    const best = group.reduce((b, t) => t.pnl > b.pnl ? t : b, group[0]);
                    const worst = group.reduce((b, t) => t.pnl < b.pnl ? t : b, group[0]);
                    return {
                        ticker: tk,
                        count: group.length,
                        winRate: group.length ? (gWins.length / group.length) * 100 : null,
                        avgPnl: group.length ? group.reduce((s, t) => s + t.pnl, 0) / group.length : null,
                        totalPnl: group.reduce((s, t) => s + t.pnl, 0),
                        bestPnl: best.pnl,
                        worstPnl: worst.pnl,
                    };
                }).sort((a, b) => b.totalPnl - a.totalPnl);

                // Monthly P&L
                const monthMap = {};
                trades.forEach(t => {
                    const m = t.exit.slice(0, 7); // "YYYY-MM"
                    if (!monthMap[m]) monthMap[m] = { pnl: 0, wins: 0, count: 0 };
                    monthMap[m].pnl += t.pnl;
                    monthMap[m].count++;
                    if (t.result === 'win') monthMap[m].wins++;
                });
                const monthStats = Object.entries(monthMap)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, v]) => ({
                        month,
                        label: new Date(month + '-15').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                        pnl: v.pnl,
                        winRate: (v.wins / v.count) * 100,
                        count: v.count,
                    }));

                const CARD = "bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-5";
                const TH = "text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
                const TD = "px-4 py-3 text-sm";
                const winPct = n => n == null ? '—' : `${n.toFixed(0)}%`;
                const toggleChart = key => setChartMode(prev => ({ ...prev, [key]: !prev[key] }));
                const isChart = key => !!chartMode[key];

                const ViewToggle = ({ id }) => (
                    <button
                        onClick={() => toggleChart(id)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ring-1 transition-colors ${
                            isChart(id)
                                ? 'bg-blue-500/20 text-blue-300 ring-blue-500/30'
                                : 'bg-white/[0.05] text-slate-400 ring-white/10 hover:text-slate-200'
                        }`}
                    >
                        {isChart(id) ? 'Table' : 'Chart'}
                    </button>
                );

                const chartTooltipStyle = { backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 };

                return (
                    <div className="space-y-4 mt-4">
                        {/* Summary metrics row */}
                        <div className={CARD}>
                            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 mb-4">Performance Statistics</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                {[
                                    { label: 'Profit Factor', value: profitFactor != null ? profitFactor.toFixed(2) : '—', color: profitFactor != null && profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor != null && profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400' },
                                    { label: 'Avg Win', value: avgWin != null ? fmt$(avgWin) : '—', color: 'text-emerald-400' },
                                    { label: 'Avg Loss', value: avgLoss != null ? fmt$(avgLoss) : '—', color: 'text-red-400' },
                                    { label: 'Reward/Risk', value: avgWin != null && avgLoss != null && avgLoss !== 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : '—', color: 'text-blue-400' },
                                    { label: 'Best Trade', value: fmt$(bestTrade.pnl), sub: bestTrade.ticker, color: 'text-emerald-400' },
                                    { label: 'Worst Trade', value: fmt$(worstTrade.pnl), sub: worstTrade.ticker, color: 'text-red-400' },
                                    { label: 'Avg Duration', value: `${avgDur}d`, color: 'text-slate-300' },
                                    { label: 'Current Streak', value: `${streak}W ${streakType === 'win' ? '🔥' : streakType === 'loss' ? '❄' : ''}`, color: streakType === 'win' ? 'text-emerald-400' : 'text-red-400' },
                                ].map(({ label, value, sub, color }) => (
                                    <div key={label}>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</div>
                                        <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
                                        {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* DTE Bucket breakdown */}
                            <div className={CARD}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">By DTE Bucket</h2>
                                    <ViewToggle id="dte" />
                                </div>
                                {isChart('dte') ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={dteBuckets} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v}`} />
                                            <Tooltip contentStyle={chartTooltipStyle} formatter={(v, n) => [n === 'avgAnn' ? fmtAnn(v) : fmt$(v), n === 'totalPnl' ? 'Total P&L' : n === 'avgPnl' ? 'Avg P&L' : 'Avg Ann%']} />
                                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                                            <Bar dataKey="totalPnl" radius={[4,4,0,0]}>
                                                {dteBuckets.map((b, i) => <Cell key={i} fill={b.totalPnl >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.8} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.05]">
                                                {['Bucket', 'Trades', 'Win%', 'Avg P&L', 'Total P&L', 'Avg Ann%'].map(h => <th key={h} className={TH}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dteBuckets.map(b => (
                                                <tr key={b.label} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                    <td className={`${TD} font-semibold text-slate-200`}>{b.label}</td>
                                                    <td className={`${TD} text-slate-400`}>{b.count}</td>
                                                    <td className={`${TD} ${b.winRate >= 70 ? 'text-emerald-400' : b.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{winPct(b.winRate)}</td>
                                                    <td className={`${TD} tabular-nums ${b.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(b.avgPnl)}</td>
                                                    <td className={`${TD} tabular-nums font-semibold ${b.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(b.totalPnl)}</td>
                                                    <td className={`${TD} tabular-nums ${b.avgAnn >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{b.avgAnn != null ? fmtAnn(b.avgAnn) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Per-strategy */}
                            <div className={CARD}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">By Strategy</h2>
                                    <ViewToggle id="strategy" />
                                </div>
                                {isChart('strategy') ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={stratStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="strategy" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v}`} />
                                            <Tooltip contentStyle={chartTooltipStyle} formatter={(v, n) => [n === 'avgAnn' ? fmtAnn(v) : fmt$(v), n === 'totalPnl' ? 'Total P&L' : 'Avg P&L']} />
                                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                                            <Bar dataKey="totalPnl" name="Total P&L" radius={[4,4,0,0]}>
                                                {stratStats.map((s, i) => <Cell key={i} fill={s.totalPnl >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.8} />)}
                                            </Bar>
                                            <Bar dataKey="avgPnl" name="Avg P&L" radius={[4,4,0,0]}>
                                                {stratStats.map((s, i) => <Cell key={i} fill={s.avgPnl >= 0 ? '#60a5fa' : '#f87171'} fillOpacity={0.6} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.05]">
                                                {['Strategy', 'Trades', 'Win%', 'Avg P&L', 'Total P&L', 'Avg Ann%'].map(h => <th key={h} className={TH}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stratStats.map(s => (
                                                <tr key={s.strategy} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                    <td className={`${TD} font-bold text-slate-100`}>{s.strategy}</td>
                                                    <td className={`${TD} text-slate-400`}>{s.count}</td>
                                                    <td className={`${TD} ${s.winRate >= 70 ? 'text-emerald-400' : s.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{winPct(s.winRate)}</td>
                                                    <td className={`${TD} tabular-nums ${s.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(s.avgPnl)}</td>
                                                    <td className={`${TD} tabular-nums font-semibold ${s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(s.totalPnl)}</td>
                                                    <td className={`${TD} tabular-nums ${s.avgAnn >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{s.avgAnn != null ? fmtAnn(s.avgAnn) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Per-ticker */}
                        <div className={CARD}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">By Ticker</h2>
                                <ViewToggle id="ticker" />
                            </div>
                            {isChart('ticker') ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={tickerStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v}`} />
                                        <Tooltip contentStyle={chartTooltipStyle} formatter={(v, n) => [fmt$(v), n === 'totalPnl' ? 'Total P&L' : 'Avg P&L']} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                                        <Bar dataKey="totalPnl" name="Total P&L" radius={[4,4,0,0]}>
                                            {tickerStats.map((tk, i) => <Cell key={i} fill={tk.totalPnl >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.8} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.05]">
                                                {['Ticker', 'Trades', 'Win%', 'Avg P&L', 'Total P&L', 'Best', 'Worst'].map(h => <th key={h} className={TH}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickerStats.map(tk => (
                                                <tr key={tk.ticker} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                    <td className={`${TD} font-bold text-slate-100`}>{tk.ticker}</td>
                                                    <td className={`${TD} text-slate-400`}>{tk.count}</td>
                                                    <td className={`${TD} ${tk.winRate >= 70 ? 'text-emerald-400' : tk.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{winPct(tk.winRate)}</td>
                                                    <td className={`${TD} tabular-nums ${tk.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(tk.avgPnl)}</td>
                                                    <td className={`${TD} tabular-nums font-semibold ${tk.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(tk.totalPnl)}</td>
                                                    <td className="px-4 py-3 tabular-nums text-sm text-emerald-400">{fmt$(tk.bestPnl)}</td>
                                                    <td className="px-4 py-3 tabular-nums text-sm text-red-400">{fmt$(tk.worstPnl)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Monthly P&L */}
                        <div className={CARD}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Monthly P&L</h2>
                                <ViewToggle id="monthly" />
                            </div>
                            {isChart('monthly') ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={monthStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${v}`} />
                                        <Tooltip contentStyle={chartTooltipStyle} formatter={v => [fmt$(v), 'P&L']} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                                        <Bar dataKey="pnl" radius={[4,4,0,0]}>
                                            {monthStats.map((m, i) => <Cell key={i} fill={m.pnl >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.8} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/[0.05]">
                                                {['Month', 'Trades', 'Win%', 'Total P&L'].map(h => <th key={h} className={TH}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthStats.map(m => (
                                                <tr key={m.month} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                                    <td className={`${TD} font-semibold text-slate-200`}>{m.label}</td>
                                                    <td className={`${TD} text-slate-400`}>{m.count}</td>
                                                    <td className={`${TD} ${m.winRate >= 70 ? 'text-emerald-400' : m.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{winPct(m.winRate)}</td>
                                                    <td className={`${TD} tabular-nums font-semibold ${m.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt$(m.pnl)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {tab === 'strikes' && <StrikeCalculator />}
        </div>
    );
}
