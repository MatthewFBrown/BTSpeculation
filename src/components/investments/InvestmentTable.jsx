import { useState, useRef, useEffect } from 'react'
import { calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { Pencil, Trash2, ImageIcon, RefreshCw, SlidersHorizontal, X } from 'lucide-react'

const STATUS_OPTIONS = ['all', 'open', 'closed']
const TYPE_OPTIONS   = ['All Types', 'Stock', 'ETF', 'Crypto', 'Bond', 'Option', 'Other']

export default function InvestmentTable({ investments, onDelete, onEdit, onUpdatePrice }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('All Types')
  const [showFilters,  setShowFilters]  = useState(false)
  const dropRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFilters) return
    function handle(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowFilters(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showFilters])

  const filtered = investments.filter(i => {
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    const matchType   = typeFilter === 'All Types' || i.assetType === typeFilter
    return matchStatus && matchType
  })

  const activeCount = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'All Types' ? 1 : 0)

  function clearFilters() {
    setStatusFilter('all')
    setTypeFilter('All Types')
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeCount > 0
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <SlidersHorizontal size={12} />
            Filter
            {activeCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showFilters && (
            <div className="absolute left-0 top-full mt-2 z-30 bg-slate-800 ring-1 ring-white/[0.08] rounded-xl shadow-2xl p-4 w-56">
              {/* Status */}
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Status</p>
              <div className="flex gap-1.5 mb-4">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Type */}
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      typeFilter === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {t === 'All Types' ? 'All' : t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-700/60 text-slate-300 hover:text-white ring-1 ring-white/[0.06] capitalize transition-colors"
          >
            {statusFilter} <X size={10} />
          </button>
        )}
        {typeFilter !== 'All Types' && (
          <button
            onClick={() => setTypeFilter('All Types')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-700/60 text-slate-300 hover:text-white ring-1 ring-white/[0.06] transition-colors"
          >
            {typeFilter} <X size={10} />
          </button>
        )}
        {activeCount > 1 && (
          <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1">
            Clear all
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500">{filtered.length} position{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-slate-500 py-16 text-sm">No positions match the selected filters.</div>
      )}

      {filtered.length > 0 && (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-2">
            {filtered.map(inv => {
              const { total, returnPct } = calcInvestmentPnL(inv)
              const shares = parseFloat(inv.shares) || 0
              const currentPrice = parseFloat(inv.currentPrice) || 0
              const sellPrice = parseFloat(inv.sellPrice) || 0
              const marketValue = inv.status === 'open' ? shares * currentPrice : shares * sellPrice
              const displayPrice = inv.status === 'open' ? inv.currentPrice : inv.sellPrice

              return (
                <div key={inv.id} className="bg-slate-800 rounded-lg border border-slate-700 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-semibold text-slate-100">{inv.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{inv.assetType}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${inv.status === 'open' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-700 text-slate-400'}`}>{inv.status}</span>
                      </div>
                      {inv.name && <p className="text-xs text-slate-500 mt-0.5 truncate">{inv.name}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {inv.chartLink && (
                        <a href={inv.chartLink} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-400 p-1"><ImageIcon size={13} /></a>
                      )}
                      <button onClick={() => onEdit(inv)} className="text-slate-500 hover:text-blue-400 p-1"><Pencil size={13} /></button>
                      <button onClick={() => onDelete(inv.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-slate-500">Price
                      {inv.status === 'open' ? (
                        <button onClick={() => onUpdatePrice(inv)} className="ml-1 text-slate-600 hover:text-blue-400"><RefreshCw size={10} className="inline" /></button>
                      ) : null}
                      <span className="ml-1 font-mono text-slate-300">{displayPrice ? `$${parseFloat(displayPrice).toFixed(2)}` : '—'}</span>
                    </div>
                    <div className="text-slate-500">Shares <span className="font-mono text-slate-300">{inv.shares}</span></div>
                    <div className="text-slate-500">Avg <span className="font-mono text-slate-300">${parseFloat(inv.avgCost).toFixed(2)}</span></div>
                    {marketValue > 0 && <div className="text-slate-500">Value <span className="font-mono text-slate-300">{fmtInv(marketValue)}</span></div>}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-sm font-semibold font-mono ${total === null ? 'text-slate-500' : total >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtInv(total)}</span>
                    <span className={`text-xs font-semibold font-mono ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(returnPct)}</span>
                    {inv.buyDate && <span className="text-xs text-slate-600 ml-auto">{inv.buyDate}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Symbol</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Sector</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Shares</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Avg Cost</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Price</th>
                  <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Mkt Val</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">P&L</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Return</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="hidden md:table-cell px-3 py-2 text-left text-xs font-medium text-slate-400">Buy Date</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map(inv => {
                  const { total, returnPct } = calcInvestmentPnL(inv)
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
                          <span className="font-mono font-semibold text-slate-100 text-xs">{inv.symbol}</span>
                          {inv.name && <p className="text-xs text-slate-500 truncate max-w-[120px]">{inv.name}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{inv.assetType}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{inv.sector}</td>
                      <td className="px-3 py-2 font-mono text-slate-300 text-xs">{inv.shares}</td>
                      <td className="px-3 py-2 font-mono text-slate-300 text-xs">${parseFloat(inv.avgCost).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {inv.status === 'open' ? (
                          <div className="flex items-center gap-1 group">
                            <span className="font-mono text-slate-300 text-xs">{displayPrice ? `$${parseFloat(displayPrice).toFixed(2)}` : '—'}</span>
                            <button onClick={() => onUpdatePrice(inv)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity" title="Update price">
                              <RefreshCw size={11} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-300 text-xs">${parseFloat(displayPrice).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 font-mono text-slate-300 text-xs">{marketValue > 0 ? fmtInv(marketValue) : '—'}</td>
                      <td className={`px-3 py-2 font-mono font-medium text-xs ${pnl === null ? 'text-slate-500' : pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtInv(pnl)}</td>
                      <td className={`px-3 py-2 font-mono text-xs font-medium ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(returnPct)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${inv.status === 'open' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-700 text-slate-400'}`}>{inv.status}</span>
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
        </>
      )}
    </div>
  )
}
