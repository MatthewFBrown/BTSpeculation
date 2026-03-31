import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1']

export default function SectorAnalysis({ investments }) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  if (open.length === 0) return <div className="text-center text-slate-500 py-16 text-sm">No open positions to analyse.</div>

  const map = {}
  open.forEach(inv => {
    const sector = inv.sector || 'Other'
    const mv = (parseFloat(inv.shares) || 0) * (parseFloat(inv.currentPrice) || parseFloat(inv.avgCost) || 0)
    const cost = (parseFloat(inv.shares) || 0) * (parseFloat(inv.avgCost) || 0)
    const { total } = calcInvestmentPnL(inv)
    if (!map[sector]) map[sector] = { sector, mv: 0, cost: 0, pnl: 0, count: 0 }
    map[sector].mv += mv
    map[sector].cost += cost
    map[sector].pnl += total ?? 0
    map[sector].count++
  })

  const totalMV = Object.values(map).reduce((a, b) => a + b.mv, 0)
  const rows = Object.values(map)
    .map(s => ({ ...s, weight: totalMV > 0 ? (s.mv / totalMV) * 100 : 0, returnPct: s.cost > 0 ? (s.pnl / s.cost) * 100 : 0 }))
    .sort((a, b) => b.mv - a.mv)

  const weightData = rows.map((r, i) => ({ name: r.sector, value: +r.weight.toFixed(1), fill: COLORS[i % COLORS.length] }))
  const pnlData = rows.map((r, i) => ({ name: r.sector, pnl: +r.pnl.toFixed(0), fill: r.pnl >= 0 ? '#10b981' : '#ef4444' }))

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sector</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Positions</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Market Value</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Weight</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">P&L</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.sector} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {r.sector}
                </td>
                <td className="px-4 py-3 text-right text-slate-400">{r.count}</td>
                <td className="px-4 py-3 text-right text-slate-200 tabular-nums">{fmtInv(r.mv)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.weight}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-slate-300 w-12 text-right">{r.weight.toFixed(1)}%</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${r.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtInv(r.pnl)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${r.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtPct(r.returnPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Allocation by Sector (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weightData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={130} />
              <Tooltip formatter={v => [`${v}%`, 'Weight']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {weightData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">P&L by Sector ($)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pnlData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={130} />
              <Tooltip formatter={v => [new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v), 'P&L']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                {pnlData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
