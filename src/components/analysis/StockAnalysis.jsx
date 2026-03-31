import { useState } from 'react'
import { calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { getAssetParams } from '../../utils/efficientFrontier'
import { Target, TrendingDown, DollarSign, BarChart2 } from 'lucide-react'

function PriceLadder({ stop, cost, current, target }) {
  const allPrices = [stop, cost, current, target].filter(p => p !== null && !isNaN(p))
  if (allPrices.length < 2) return null
  const lo = Math.min(...allPrices) * 0.97
  const hi = Math.max(...allPrices) * 1.03
  const range = hi - lo

  function pct(p) { return ((p - lo) / range) * 100 }

  const levels = [
    stop   != null && { label: 'Stop',    price: stop,    color: 'bg-red-500',   text: 'text-red-400' },
    cost   != null && { label: 'Avg Cost', price: cost,   color: 'bg-slate-400', text: 'text-slate-300' },
    current != null && { label: 'Current', price: current, color: 'bg-blue-400', text: 'text-blue-400' },
    target != null && { label: 'Target',  price: target,  color: 'bg-green-400', text: 'text-green-400' },
  ].filter(Boolean)

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Price Levels</p>
      <div className="relative h-8 bg-slate-700/50 rounded-full mx-2 mt-6">
        {/* Fill between stop and current */}
        {stop != null && current != null && (
          <div
            className={`absolute h-full rounded-full ${current >= stop ? 'bg-green-500/20' : 'bg-red-500/20'}`}
            style={{ left: `${pct(Math.min(stop, current))}%`, width: `${Math.abs(pct(current) - pct(stop))}%` }}
          />
        )}
        {levels.map(({ label, price, color, text }) => (
          <div key={label} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(price)}%` }}>
            <span className={`text-[10px] font-medium ${text} mb-1 whitespace-nowrap`} style={{ marginTop: '-28px' }}>${price.toLocaleString()}</span>
            <div className={`w-3 h-3 rounded-full border-2 border-slate-800 ${color}`} />
            <span className={`text-[9px] ${text} mt-1 whitespace-nowrap`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StockAnalysis({ investments }) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  const [selected, setSelected] = useState(open[0]?.id || '')

  if (open.length === 0) return <div className="text-center text-slate-500 py-16 text-sm">No open positions to analyse.</div>

  const inv = open.find(i => i.id === selected) || open[0]
  const { unrealized, returnPct } = calcInvestmentPnL(inv)
  const shares = parseFloat(inv.shares) || 0
  const cost = parseFloat(inv.avgCost) || 0
  const current = parseFloat(inv.currentPrice) || cost
  const stop = parseFloat(inv.stopLoss) || null
  const target = parseFloat(inv.targetPrice) || null
  const mv = shares * current
  const params = getAssetParams(inv.symbol)

  const totalMV = open.reduce((acc, i) => acc + (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0), 0)
  const weight = totalMV > 0 ? (mv / totalMV) * 100 : 0

  const riskPerShare = stop ? current - stop : null
  const rewardPerShare = target ? target - current : null
  const rrRatio = riskPerShare && rewardPerShare && riskPerShare > 0 ? rewardPerShare / riskPerShare : null
  const dollarRisk = riskPerShare != null ? riskPerShare * shares : null

  return (
    <div className="space-y-4">
      {/* Symbol selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Position:</label>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
        >
          {open.map(i => (
            <option key={i.id} value={i.id}>{i.symbol} — {i.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: metrics */}
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700">
            {[
              { label: 'Market Value', value: fmtInv(mv), color: 'text-slate-100' },
              { label: 'Unrealized P&L', value: unrealized != null ? fmtInv(unrealized) : '—', color: unrealized >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Return', value: fmtPct(returnPct), color: returnPct >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Portfolio Weight', value: `${weight.toFixed(1)}%`, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Detail rows */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700/60">
            {[
              { label: 'Shares', value: shares.toLocaleString() },
              { label: 'Avg Cost', value: `$${cost.toFixed(2)}` },
              { label: 'Current Price', value: `$${current.toFixed(2)}` },
              { label: 'Cost Basis', value: fmtInv(shares * cost) },
              { label: 'Asset Type', value: inv.assetType || '—' },
              { label: 'Sector', value: inv.sector || '—' },
              { label: 'Buy Date', value: inv.buyDate || '—' },
              { label: 'Est. Annual Return', value: `${(params.r * 100).toFixed(0)}%`, sub: 'assumed' },
              { label: 'Est. Volatility', value: `${(params.s * 100).toFixed(0)}%`, sub: 'assumed' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-medium text-slate-200 tabular-nums">
                  {value} {sub && <span className="text-xs text-slate-500">({sub})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: risk/reward + price ladder */}
        <div className="space-y-4">
          {/* R:R metrics */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Risk / Reward</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1.5"><TrendingDown size={13} className="text-red-400" /> Stop Loss</span>
                <span className="text-sm font-medium text-slate-200">{stop ? `$${stop.toFixed(2)}` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1.5"><Target size={13} className="text-green-400" /> Target Price</span>
                <span className="text-sm font-medium text-slate-200">{target ? `$${target.toFixed(2)}` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1.5"><DollarSign size={13} className="text-red-400" /> $ at Risk</span>
                <span className="text-sm font-medium text-red-400">{dollarRisk != null ? fmtInv(dollarRisk) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1.5"><BarChart2 size={13} className="text-yellow-400" /> R:R Ratio</span>
                <span className={`text-sm font-semibold ${rrRatio >= 2 ? 'text-green-400' : rrRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {rrRatio != null ? `${rrRatio.toFixed(2)} : 1` : '—'}
                </span>
              </div>
            </div>

            <PriceLadder stop={stop} cost={cost} current={current} target={target} />
          </div>

          {/* Notes */}
          {inv.notes && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Thesis / Notes</p>
              <p className="text-sm text-slate-300 leading-relaxed">{inv.notes}</p>
            </div>
          )}

          {/* Chart link */}
          {inv.chartLink && (
            <a href={inv.chartLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-blue-500 transition-colors text-sm text-blue-400">
              <BarChart2 size={15} /> View Chart
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
