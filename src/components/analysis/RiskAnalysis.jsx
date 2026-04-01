import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { getPortfolioRiskMetrics, getRiskContribution, getCorrelationMatrix, getStressTests } from '../../utils/efficientFrontier'
import { fmtInv } from '../../utils/investmentCalcs'
import { ShieldAlert, TrendingDown, Activity, AlertTriangle, ChevronDown, ChevronRight, Info, X } from 'lucide-react'

// ── Reusable info popup ───────────────────────────────────────
function SectionInfo({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-700 sticky top-0 bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-slate-300 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function InfoBtn({ onClick }) {
  return (
    <button onClick={onClick} className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors bg-slate-700/50 hover:bg-blue-500/10 px-2 py-0.5 rounded">
      <Info size={11} /> How to read
    </button>
  )
}

function Meter({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Stress Tests ────────────────────────────────────────────
function StressTests({ investments }) {
  const scenarios = getStressTests(investments)
  const [expanded, setExpanded] = useState(null)
  const [info, setInfo] = useState(false)

  if (!scenarios.length) return null

  const colorMap = {
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  bar: '#10b981' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: '#eab308' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: '#f97316' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    bar: '#ef4444' },
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 border-t-2 border-t-orange-500 p-4">
      {info && (
        <SectionInfo title="How to Read: Stress Tests" onClose={() => setInfo(false)}>
          <p>This section shows how your portfolio would <span className="text-white font-medium">theoretically perform</span> if the overall stock market moved by a specific percentage.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 mt-3 mb-1">The Math</h4>
          <p>Each scenario uses your portfolio's <span className="text-white font-medium">weighted beta</span> to estimate the move:</p>
          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 my-2">
            Portfolio Move = Portfolio Beta × Market Move<br />
            Dollar Impact = Portfolio Move × Total Market Value
          </div>
          <p>Per-position impacts use each stock's individual beta, so high-beta stocks (like crypto or growth tech) will show larger swings.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 mt-3 mb-1">What Beta Means Here</h4>
          <p>A beta of <span className="text-white font-medium">1.5</span> means if the market falls 20%, that position is expected to fall ~30%. A beta of <span className="text-white font-medium">0.5</span> means it would only fall ~10%.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 mt-3 mb-1">Click to Expand</h4>
          <p>Tap any scenario row to see the breakdown for each individual position — useful for identifying which holdings cause the most damage in a downturn.</p>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2 text-xs text-yellow-200/80">
            These are estimates based on historical beta and assume a linear relationship with the market. In real crashes, correlations often increase and losses can be worse than predicted.
          </div>
        </SectionInfo>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Activity size={15} className="text-orange-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stress Test Scenarios</p>
        <InfoBtn onClick={() => setInfo(true)} />
      </div>
      <p className="text-xs text-slate-600 mb-4">Estimated portfolio impact under different market conditions, based on portfolio beta</p>

      <div className="space-y-2">
        {scenarios.map(s => {
          const c = colorMap[s.color]
          const isOpen = expanded === s.name
          const positive = s.dollarImpact >= 0
          return (
            <div key={s.name} className={`rounded-lg border ${c.border} ${c.bg} overflow-hidden`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(isOpen ? null : s.name)}
              >
                <span className="text-base shrink-0">{s.icon}</span>
                <span className="text-sm font-semibold text-slate-200 w-28 shrink-0">{s.name}</span>
                <span className="text-xs text-slate-500 shrink-0">
                  Market {s.marketMove > 0 ? '+' : ''}{(s.marketMove * 100).toFixed(0)}%
                </span>
                <span className="flex-1" />
                <span className={`text-sm font-bold tabular-nums ${c.text}`}>
                  {positive ? '+' : ''}{s.portMovePct}%
                </span>
                <span className={`text-sm font-bold tabular-nums ml-2 ${positive ? 'text-green-400' : 'text-red-400'}`}>
                  {positive ? '+' : ''}{fmtInv(s.dollarImpact)}
                </span>
                {isOpen ? <ChevronDown size={14} className="text-slate-500 ml-2 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 ml-2 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mt-2 mb-2">Per-position estimated impact</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-600 border-b border-slate-700/50">
                          <th className="text-left py-1.5">Symbol</th>
                          <th className="text-right py-1.5">Beta</th>
                          <th className="text-right py-1.5">Est. Move</th>
                          <th className="text-right py-1.5">$ Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.positions.map(p => (
                          <tr key={p.symbol} className="border-b border-slate-700/30">
                            <td className="py-1.5 font-semibold text-slate-300">{p.symbol}</td>
                            <td className="py-1.5 text-right text-slate-400">{p.beta}x</td>
                            <td className={`py-1.5 text-right font-medium ${p.movePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {p.movePct >= 0 ? '+' : ''}{p.movePct}%
                            </td>
                            <td className={`py-1.5 text-right font-medium ${p.impact >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {p.impact >= 0 ? '+' : ''}{fmtInv(p.impact)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Risk Contribution ────────────────────────────────────────
function RiskContribution({ investments }) {
  const data = getRiskContribution(investments)
  const [info, setInfo] = useState(false)
  if (!data.length) return null

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 border-t-2 border-t-purple-500 p-4">
      {info && (
        <SectionInfo title="How to Read: Risk Contribution" onClose={() => setInfo(false)}>
          <p>Your portfolio's total volatility isn't just the average of each stock's volatility — it depends on <span className="text-white font-medium">how much each position contributes</span> to the combined risk, accounting for correlations.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mt-3 mb-1">The Two Bars</h4>
          <ul className="space-y-1.5 text-sm">
            <li><span className="text-slate-400 font-medium">Gray bar</span> — the position's weight in your portfolio (% of total market value)</li>
            <li><span className="text-violet-400 font-medium">Purple bar</span> — the position's share of total portfolio volatility (risk contribution %)</li>
          </ul>
          <p className="mt-2">If the purple bar is much wider than the gray bar, that position is driving <span className="text-white font-medium">more risk than its size suggests</span>.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mt-3 mb-1">Risk / Weight Ratio (Table)</h4>
          <p>This is the key number to watch:</p>
          <ul className="space-y-1 text-sm mt-1">
            <li><span className="text-red-400 font-medium">{'>'}1.3×</span> — position takes up much more risk than its dollar size. Consider trimming or hedging.</li>
            <li><span className="text-slate-300 font-medium">0.7–1.3×</span> — risk and weight are roughly proportional. Normal.</li>
            <li><span className="text-green-400 font-medium">{'<'}0.7×</span> — position is risk-efficient. It adds return without proportionally adding volatility (often due to low correlation with the rest of the portfolio).</li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mt-3 mb-1">How It's Calculated</h4>
          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300">
            MCR_i = wᵢ × Cov(Rᵢ, Rₚ) / σₚ<br />
            Risk % = MCR_i / σₚ × 100
          </div>
          <p className="text-xs text-slate-500 mt-1">MCR = Marginal Contribution to Risk. Cov = covariance of the position with the portfolio. σₚ = portfolio volatility.</p>
        </SectionInfo>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Activity size={15} className="text-purple-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Contribution by Position</p>
        <InfoBtn onClick={() => setInfo(true)} />
      </div>
      <p className="text-xs text-slate-600 mb-4">What % of total portfolio volatility each position is responsible for</p>

      <div className="space-y-2 mb-5">
        {data.map((d, i) => {
          const overWeight = d.riskPct > d.weight + 5
          const underWeight = d.riskPct < d.weight - 5
          return (
            <div key={d.symbol}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-200 w-12 shrink-0">{d.symbol}</span>
                <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden flex">
                  {/* Weight bar (gray) */}
                  <div className="h-full bg-slate-500/50 rounded-full" style={{ width: `${d.weight}%` }} />
                </div>
                <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                  {/* Risk contribution bar (colored) */}
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(d.riskPct, 100)}%`, background: overWeight ? '#ef4444' : '#8b5cf6' }}
                  />
                </div>
                <span className="text-xs tabular-nums text-slate-400 w-10 text-right shrink-0">{d.riskPct.toFixed(1)}%</span>
                {overWeight && <span className="text-[10px] text-red-400 shrink-0">↑ outsized</span>}
                {underWeight && <span className="text-[10px] text-green-400 shrink-0">↓ efficient</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-500/50" /> Portfolio Weight %</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-violet-500" /> Risk Contribution %</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500" /> Outsized Risk</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="text-left py-2">Symbol</th>
              <th className="text-right py-2">Weight</th>
              <th className="text-right py-2">Risk Contribution</th>
              <th className="text-right py-2">Beta</th>
              <th className="text-right py-2">Est. Vol</th>
              <th className="text-right py-2">Risk/Weight Ratio</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => {
              const ratio = d.weight > 0 ? d.riskPct / d.weight : 0
              const ratioColor = ratio > 1.3 ? 'text-red-400' : ratio < 0.7 ? 'text-green-400' : 'text-slate-300'
              return (
                <tr key={d.symbol} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                  <td className="py-2 font-semibold text-slate-200">{d.symbol}</td>
                  <td className="py-2 text-right text-yellow-400">{d.weight.toFixed(1)}%</td>
                  <td className="py-2 text-right text-violet-400 font-medium">{d.riskPct.toFixed(1)}%</td>
                  <td className="py-2 text-right text-slate-300">{d.beta}x</td>
                  <td className="py-2 text-right text-slate-400">{d.vol}%</td>
                  <td className={`py-2 text-right font-semibold ${ratioColor}`}>{ratio.toFixed(2)}x</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 mt-2">Risk/Weight Ratio {'>'} 1 means the position contributes more risk than its size warrants</p>
    </div>
  )
}

// ── Correlation Matrix ────────────────────────────────────────
function CorrelationMatrix({ investments, corrVersion }) {  // eslint-disable-line no-unused-vars
  const { symbols, matrix } = getCorrelationMatrix(investments)
  const [info, setInfo] = useState(false)
  if (!symbols.length) return null

  function cellColor(v) {
    // High correlation = red/orange, low/negative = green/blue
    if (v >= 0.99) return { bg: '#1e293b', text: '#94a3b8' } // diagonal
    if (v >= 0.75) return { bg: '#7f1d1d', text: '#fca5a5' }
    if (v >= 0.50) return { bg: '#991b1b', text: '#fca5a5' }
    if (v >= 0.25) return { bg: '#b45309', text: '#fde68a' }
    if (v >= 0.00) return { bg: '#365314', text: '#bef264' }
    if (v >= -0.25) return { bg: '#164e63', text: '#67e8f9' }
    return { bg: '#1e3a5f', text: '#93c5fd' }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 border-t-2 border-t-cyan-500 p-4">
      {info && (
        <SectionInfo title="How to Read: Correlation Matrix" onClose={() => setInfo(false)}>
          <p>Each cell shows the estimated <span className="text-white font-medium">correlation coefficient</span> between two holdings — how closely their prices tend to move together.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-3 mb-1">The Scale (−1 to +1)</h4>
          <ul className="space-y-1.5 text-sm">
            <li><span className="text-blue-400 font-medium">−1.0</span> — perfect inverse relationship. When one goes up, the other goes down. Maximum diversification benefit.</li>
            <li><span className="text-green-400 font-medium">0.0</span> — no relationship. Moves are independent of each other.</li>
            <li><span className="text-yellow-400 font-medium">+0.50</span> — moderate positive correlation. They tend to move in the same direction about half the time.</li>
            <li><span className="text-red-400 font-medium">+1.0</span> — perfect positive correlation. They move in lockstep. Holding both gives you no extra diversification.</li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-3 mb-1">What to Look For</h4>
          <ul className="space-y-1 text-sm">
            <li>🔴 <span className="text-white font-medium">Dark red cells</span> — these pairs are highly correlated. You may be doubling up on the same risk.</li>
            <li>🟢 <span className="text-white font-medium">Green/blue cells</span> — these pairs are low or negatively correlated. They provide genuine diversification.</li>
            <li>⬛ <span className="text-white font-medium">Diagonal (—)</span> — a stock is always perfectly correlated with itself, so these are excluded.</li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-3 mb-1">Practical Example</h4>
          <p>If AAPL and MSFT show 0.65, they're highly correlated — a tech selloff hits both. Adding TLT (bonds, typically −0.10 to tech) would reduce that cluster risk.</p>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2 text-xs text-yellow-200/80">
            These are estimated correlations based on asset categories, not live market data. Real correlations shift over time and tend to spike toward +1 during market crises.
          </div>
        </SectionInfo>
      )}
      <div className="flex items-center gap-2 mb-1">
        <Activity size={15} className="text-cyan-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correlation Matrix</p>
        <InfoBtn onClick={() => setInfo(true)} />
      </div>
      <p className="text-xs text-slate-600 mb-4">Estimated pairwise correlations between holdings. High correlation = positions move together = less diversification</p>

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-14" />
              {symbols.map(s => (
                <th key={s} className="w-12 pb-1 text-center text-slate-400 font-semibold text-[10px]">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((row, i) => (
              <tr key={row}>
                <td className="pr-2 text-right text-slate-400 font-semibold text-[10px] whitespace-nowrap">{row}</td>
                {matrix[i].map((val, j) => {
                  const { bg, text } = cellColor(val)
                  return (
                    <td key={j} className="p-0.5">
                      <div
                        className="w-11 h-9 rounded flex items-center justify-center text-[10px] font-semibold"
                        style={{ background: bg, color: text }}
                        title={`${row} × ${symbols[j]}: ${val}`}
                      >
                        {i === j ? '—' : val.toFixed(2)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-700">
        {[
          { bg: '#1e3a5f', text: '#93c5fd', label: 'Negative (diversifying)' },
          { bg: '#365314', text: '#bef264', label: '0 – 0.25 (low)' },
          { bg: '#b45309', text: '#fde68a', label: '0.25 – 0.50 (moderate)' },
          { bg: '#991b1b', text: '#fca5a5', label: '0.50 – 0.75 (high)' },
          { bg: '#7f1d1d', text: '#fca5a5', label: '> 0.75 (very high)' },
        ].map(({ bg, text, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-5 h-3 rounded" style={{ background: bg }} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function RiskAnalysis({ investments, cash = 0, corrVersion = 0 }) {
  const m = getPortfolioRiskMetrics(investments)
  const totalPortfolio = m ? m.totalMV + cash : cash
  const [heroInfo, setHeroInfo]  = useState(false)
  const [concInfo, setConcInfo]  = useState(false)
  const [stopInfo, setStopInfo]  = useState(false)

  if (!m) return <div className="text-center text-slate-500 py-16 text-sm">No open positions to analyse.</div>

  const betaColor = m.weightedBeta > 1.5 ? 'text-red-400' : m.weightedBeta > 1.1 ? 'text-yellow-400' : m.weightedBeta < 0.8 ? 'text-blue-400' : 'text-green-400'
  const divColor  = m.diversificationScore > 70 ? 'text-green-400' : m.diversificationScore > 50 ? 'text-yellow-400' : 'text-red-400'
  const stopColor = m.stopCoverage >= 80 ? 'text-green-400' : m.stopCoverage >= 50 ? 'text-yellow-400' : 'text-red-400'
  const concColor = m.topWeight > 30 ? 'text-red-400' : m.topWeight > 20 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="space-y-4">
      {heroInfo && (
        <SectionInfo title="How to Read: Key Risk Metrics" onClose={() => setHeroInfo(false)}>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Portfolio Beta</h4>
          <p>Beta measures how sensitive your portfolio is to market movements relative to the S&P 500 (beta = 1.0).</p>
          <ul className="space-y-1 text-sm mt-1 mb-2">
            <li><span className="text-red-400 font-medium">{'>'} 1.5</span> — high sensitivity. A 10% market drop could mean a ~15%+ portfolio drop.</li>
            <li><span className="text-yellow-400 font-medium">1.0 – 1.5</span> — moderately aggressive. Amplifies market moves.</li>
            <li><span className="text-green-400 font-medium">0.8 – 1.0</span> — roughly tracks the market.</li>
            <li><span className="text-blue-400 font-medium">{'<'} 0.8</span> — defensive. Less sensitive to market swings.</li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">1-Day 95% VaR</h4>
          <p>Value at Risk — the maximum loss you'd expect to see on any given day with 95% confidence. On 1 out of every 20 trading days, losses could <span className="text-white font-medium">exceed</span> this figure.</p>
          <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-slate-300 my-2">
            VaR = Portfolio Value × (Annual Vol / √252) × 1.645
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Diversification Score</h4>
          <p>Derived from the HHI index. 100 = perfectly spread across many uncorrelated assets. Below 50 means your portfolio is concentrated — a few positions dominate.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Stop Coverage</h4>
          <p>The percentage of your open positions that have a stop loss price set. Without a stop, a position has theoretically unlimited downside. Aim for 80%+.</p>
        </SectionInfo>
      )}
      {concInfo && (
        <SectionInfo title="How to Read: Concentration Risk" onClose={() => setConcInfo(false)}>
          <p>Concentration risk measures how much of your portfolio is tied to a single position or cluster of correlated positions.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mt-3 mb-1">Largest Position %</h4>
          <p>How much of your total portfolio value is in the single biggest holding. General guidelines:</p>
          <ul className="space-y-1 text-sm mt-1">
            <li><span className="text-green-400 font-medium">{'<'} 15%</span> — well diversified, single-stock risk is manageable</li>
            <li><span className="text-yellow-400 font-medium">15–25%</span> — moderate concentration, monitor closely</li>
            <li><span className="text-red-400 font-medium">{'>'} 25%</span> — high concentration, a bad earnings report or sector event can significantly impact your portfolio</li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mt-3 mb-1">HHI Index</h4>
          <p>The Herfindahl-Hirschman Index sums the squares of each position's weight. It captures total portfolio concentration, not just the largest position.</p>
          <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-slate-300 my-2">
            HHI = Σ (weightᵢ)²
          </div>
          <ul className="space-y-1 text-sm">
            <li><span className="text-green-400 font-medium">{'<'} 0.15</span> — diversified (10+ roughly equal positions)</li>
            <li><span className="text-yellow-400 font-medium">0.15 – 0.25</span> — moderate concentration</li>
            <li><span className="text-red-400 font-medium">{'>'} 0.25</span> — highly concentrated</li>
          </ul>
        </SectionInfo>
      )}
      {stopInfo && (
        <SectionInfo title="How to Read: Stop Loss Protection" onClose={() => setStopInfo(false)}>
          <p>This panel summarises how much of your portfolio is protected against runaway losses by stop loss orders.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mt-3 mb-1">$ at Risk if All Stops Hit</h4>
          <p>If every position with a stop loss hit its stop simultaneously, this is the total dollar loss you'd lock in. Calculated as:</p>
          <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-xs text-slate-300 my-2">
            Loss per position = (Current Price − Stop Price) × Shares
          </div>
          <p>This is your <span className="text-white font-medium">defined maximum risk</span> — positions without stops are excluded from this figure but represent unlimited risk.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mt-3 mb-1">Risk as % of Portfolio</h4>
          <p>The dollar at-risk figure expressed as a percentage of total portfolio value. As a rule of thumb, many traders aim to keep total defined risk below 10–15% of portfolio value.</p>
          <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mt-3 mb-1">1-Day VaR vs Stop Risk</h4>
          <p>VaR captures statistical daily risk across the whole portfolio. Stop risk captures your <span className="text-white font-medium">intentional</span> risk limit. If your stop risk is much higher than your VaR, your stops may be set too wide to be meaningful in a fast-moving market.</p>
        </SectionInfo>
      )}
      {/* Hero */}
      <div className="flex justify-end mb-1">
        <InfoBtn onClick={() => setHeroInfo(true)} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700">
        <div className="bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Portfolio Beta</p>
          <p className={`text-3xl font-bold tabular-nums ${betaColor}`}>{m.weightedBeta.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{m.weightedBeta > 1.1 ? 'Amplifies market moves' : m.weightedBeta < 0.9 ? 'Dampens market moves' : 'Tracks the market'}</p>
        </div>
        <div className="bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">1-Day 95% VaR</p>
          <p className="text-3xl font-bold tabular-nums text-red-400">{fmtInv(m.var95)}</p>
          <p className="text-xs text-slate-500 mt-1">Max expected daily loss</p>
        </div>
        <div className="bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Diversification</p>
          <p className={`text-3xl font-bold tabular-nums ${divColor}`}>{m.diversificationScore}<span className="text-lg">/100</span></p>
          <p className="text-xs text-slate-500 mt-1">{m.diversificationScore > 70 ? 'Well diversified' : m.diversificationScore > 50 ? 'Moderate' : 'Concentrated'}</p>
        </div>
        <div className="bg-slate-800 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Stop Coverage</p>
          <p className={`text-3xl font-bold tabular-nums ${stopColor}`}>{m.stopCoverage.toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">{m.positionsWithStop}/{m.totalPositions} positions protected</p>
        </div>
      </div>

      {/* Row 1: Concentration + Stop Loss */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 border-t-2 border-t-red-500 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={15} className="text-red-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Concentration Risk</p>
            <InfoBtn onClick={() => setConcInfo(true)} />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-400">Largest Position ({m.topPosition})</span>
                <span className={`text-sm font-semibold ${concColor}`}>{m.topWeight.toFixed(1)}%</span>
              </div>
              <Meter value={m.topWeight} max={50} color={m.topWeight > 30 ? '#ef4444' : m.topWeight > 20 ? '#eab308' : '#10b981'} />
              {m.topWeight > 25 && <p className="text-xs text-red-400 mt-1">Single position {'>'}25% — elevated idiosyncratic risk</p>}
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-400">HHI Concentration Index</span>
                <span className="text-sm font-semibold text-slate-200">{m.hhi.toFixed(3)}</span>
              </div>
              <Meter value={m.hhi} max={1} color={m.hhi > 0.25 ? '#ef4444' : m.hhi > 0.15 ? '#eab308' : '#10b981'} />
              <p className="text-xs text-slate-500 mt-1">{'< 0.15 diversified · 0.15–0.25 moderate · > 0.25 concentrated'}</p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {[
                { label: 'Total Portfolio', v: fmtInv(totalPortfolio), c: 'text-slate-200' },
              { label: 'Cash', v: fmtInv(cash), c: 'text-emerald-400' },
                { label: 'Expected Annual Return', v: `${m.expectedReturn.toFixed(1)}%`, c: 'text-green-400' },
                { label: 'Annualized Volatility', v: `${m.portfolioVol.toFixed(1)}%`, c: 'text-yellow-400' },
                { label: 'Sharpe Ratio', v: m.sharpe.toFixed(2), c: m.sharpe >= 1 ? 'text-green-400' : m.sharpe >= 0.5 ? 'text-yellow-400' : 'text-red-400' },
              ].map(({ label, v, c }) => (
                <div key={label} className="flex justify-between py-2">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 border-t-2 border-t-yellow-500 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={15} className="text-yellow-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stop Loss Protection</p>
            <InfoBtn onClick={() => setStopInfo(true)} />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-400">Positions with stop</span>
                <span className={`text-sm font-semibold ${stopColor}`}>{m.positionsWithStop} / {m.totalPositions}</span>
              </div>
              <Meter value={m.stopCoverage} max={100} color={m.stopCoverage >= 80 ? '#10b981' : m.stopCoverage >= 50 ? '#eab308' : '#ef4444'} />
            </div>
            <div className="divide-y divide-slate-700/50">
              {[
                { label: '$ at risk if all stops hit', v: fmtInv(m.dollarAtRisk), c: 'text-red-400' },
                { label: 'Risk as % of portfolio', v: `${m.totalMV > 0 ? ((m.dollarAtRisk / m.totalMV) * 100).toFixed(1) : '0.0'}%`, c: 'text-orange-400' },
                { label: '1-Day 95% VaR', v: fmtInv(m.var95), c: 'text-red-400' },
                { label: 'Portfolio Beta', v: `${m.weightedBeta.toFixed(2)}x`, c: betaColor },
              ].map(({ label, v, c }) => (
                <div key={label} className="flex justify-between py-2">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className={`text-xs font-semibold tabular-nums ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            {m.stopCoverage < 80 && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
                <AlertTriangle size={13} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-300">
                  {m.totalPositions - m.positionsWithStop} position(s) have no stop loss — unlimited downside
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stress Tests */}
      <StressTests investments={investments} />

      {/* Risk Contribution */}
      <RiskContribution investments={investments} />

      {/* Correlation Matrix */}
      <CorrelationMatrix investments={investments} corrVersion={corrVersion} />

      <p className="text-xs text-slate-600 text-center">
        All metrics use estimated historical parameters. Not financial advice.
      </p>
    </div>
  )
}
