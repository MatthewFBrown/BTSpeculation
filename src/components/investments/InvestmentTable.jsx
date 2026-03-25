import { useState } from 'react'
import { calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { Pencil, Trash2, ImageIcon, RefreshCw } from 'lucide-react'

export default function InvestmentTable({ investments, onDelete, onEdit, onUpdatePrice }) {
  const [filter, setFilter] = useState('all')

  const filtered = investments.filter(i => {
    if (filter === 'open' || filter === 'closed') return i.status === filter
    if (['Stock', 'ETF', 'Crypto', 'Bond', 'Other'].includes(filter)) return i.assetType === filter
    return true
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {['all', 'open', 'closed', 'Stock', 'ETF', 'Crypto'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} positions</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-16 text-sm">No positions yet. Click "Add Position" to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Symbol</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Type</th>
                <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Sector</th>
                <th className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Shares</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Avg Cost</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Cur. Price</th>
                <th className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Market Val.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">P&L</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Return</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Buy Date</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(inv => {
                const { unrealized, realized, total, returnPct } = calcInvestmentPnL(inv)
                const pnl = total
                const shares = parseFloat(inv.shares) || 0
                const currentPrice = parseFloat(inv.currentPrice) || 0
                const sellPrice = parseFloat(inv.sellPrice) || 0
                const marketValue = inv.status === 'open' ? shares * currentPrice : shares * sellPrice
                const displayPrice = inv.status === 'open' ? inv.currentPrice : inv.sellPrice

                return (
                  <tr key={inv.id} className="bg-slate-800 hover:bg-slate-700/60 transition-colors">
                    <td className="px-3 py-2">
                      <div>
                        <span className="font-mono font-semibold text-slate-100">{inv.symbol}</span>
                        {inv.name && <p className="text-xs text-slate-500 truncate max-w-[100px]">{inv.name}</p>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{inv.assetType}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{inv.sector}</td>
                    <td className="hidden sm:table-cell px-3 py-2 font-mono text-slate-300">{inv.shares}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">${parseFloat(inv.avgCost).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {inv.status === 'open' ? (
                        <div className="flex items-center gap-1 group">
                          <span className="font-mono text-slate-300">{displayPrice ? `$${parseFloat(displayPrice).toFixed(2)}` : '—'}</span>
                          <button onClick={() => onUpdatePrice(inv)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity" title="Update price">
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-slate-300">${parseFloat(displayPrice).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-2 font-mono text-slate-300">{marketValue > 0 ? fmtInv(marketValue) : '—'}</td>
                    <td className={`px-3 py-2 font-mono font-medium ${pnl === null ? 'text-slate-500' : pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtInv(pnl)}
                    </td>
                    <td className={`px-3 py-2 font-mono text-sm font-medium ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtPct(returnPct)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${inv.status === 'open' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-700 text-slate-400'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{inv.buyDate}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {inv.chartLink && (
                          <a href={inv.chartLink} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-400 p-1" title="View chart"><ImageIcon size={13} /></a>
                        )}
                        <button onClick={() => onEdit(inv)} className="text-slate-500 hover:text-blue-400 p-1"><Pencil size={13} /></button>
                        <button onClick={() => onDelete(inv.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
