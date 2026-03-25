import { useState } from 'react'
import { calcPnL, fmt } from '../utils/calculations'
import { Pencil, Trash2, ImageIcon } from 'lucide-react'

export default function TradeTable({ trades, onDelete, onEdit }) {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState({ field: 'entryDate', dir: 'desc' })

  const filtered = trades
    .filter(t => filter === 'all' || t.status === filter || t.type === filter)
    .sort((a, b) => {
      let av = a[sort.field] ?? ''
      let bv = b[sort.field] ?? ''
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

  function toggleSort(field) {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const Th = ({ field, children }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      {children} {sort.field === field ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {['all', 'open', 'closed', 'option', 'futures'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} trades</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-16 text-sm">No trades yet. Click "Add Trade" to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80">
              <tr>
                <Th field="entryDate">Date</Th>
                <Th field="type">Type</Th>
                <Th field="symbol">Symbol</Th>
                <th className="hidden sm:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Detail</th>
                <Th field="direction">Dir</Th>
                <Th field="quantity">Qty</Th>
                <Th field="entryPrice">Entry</Th>
                <Th field="exitPrice">Exit</Th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">P&L</th>
                <Th field="status">Status</Th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(t => {
                const pnl = calcPnL(t)
                return (
                  <tr key={t.id} className="bg-slate-800 hover:bg-slate-700/60 transition-colors">
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{t.entryDate}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.type === 'option' ? 'bg-purple-900/50 text-purple-300' : 'bg-orange-900/50 text-orange-300'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-100 font-medium">{t.symbol}</td>
                    <td className="hidden sm:table-cell px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                      {t.type === 'option' ? `${t.optionType?.toUpperCase()} ${t.strike} exp ${t.expiry}` : ''}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${t.direction === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{t.quantity}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{t.entryPrice}</td>
                    <td className="px-3 py-2 font-mono text-slate-300">{t.exitPrice || '—'}</td>
                    <td className={`px-3 py-2 font-mono font-medium ${pnl === null ? 'text-slate-500' : pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(pnl)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${t.status === 'open' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-700 text-slate-400'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {t.chartLink && (
                          <a href={t.chartLink} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-400 p-1" title="View chart"><ImageIcon size={13} /></a>
                        )}
                        <button onClick={() => onEdit(t)} className="text-slate-500 hover:text-blue-400 p-1"><Pencil size={13} /></button>
                        <button onClick={() => onDelete(t.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
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
