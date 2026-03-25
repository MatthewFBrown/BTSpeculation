import { useState } from 'react'
import { useTrades } from './hooks/useTrades'
import { useInvestments } from './hooks/useInvestments'
import Dashboard from './components/Dashboard'
import TradeForm from './components/TradeForm'
import TradeTable from './components/TradeTable'
import Charts from './components/Charts'
import InvestmentDashboard from './components/investments/InvestmentDashboard'
import InvestmentTable from './components/investments/InvestmentTable'
import InvestmentCharts from './components/investments/InvestmentCharts'
import InvestmentForm from './components/investments/InvestmentForm'
import { Plus, BarChart2, List, FlaskConical, TrendingUp } from 'lucide-react'
import { SEED_TRADES } from './utils/seedData'
import { SEED_INVESTMENTS } from './utils/seedInvestments'

export default function App() {
  const { trades, addTrade, updateTrade, deleteTrade, loadTrades } = useTrades()
  const { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments } = useInvestments()

  const [section, setSection] = useState('trading')   // 'trading' | 'investments'
  const [view, setView] = useState('trades')           // 'trades' | 'charts'
  const [invView, setInvView] = useState('positions')  // 'positions' | 'charts'

  const [showForm, setShowForm] = useState(false)
  const [editTrade, setEditTrade] = useState(null)

  const [showInvForm, setShowInvForm] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [updatePriceInv, setUpdatePriceInv] = useState(null)
  const [newPrice, setNewPrice] = useState('')

  // ── Trading handlers ───────────────────────────────────
  function handleEditTrade(trade) { setEditTrade(trade); setShowForm(true) }

  function handleSaveTrade(form) {
    if (editTrade) { updateTrade(editTrade.id, form); setEditTrade(null) }
    else addTrade(form)
  }

  function handleCloseTradeForm() { setShowForm(false); setEditTrade(null) }

  function loadDemoData() {
    if (trades.length > 0 && !confirm('This will replace your current trades with demo data. Continue?')) return
    loadTrades(SEED_TRADES)
  }

  // ── Investment handlers ────────────────────────────────
  function handleEditInv(inv) { setEditInv(inv); setShowInvForm(true) }

  function handleSaveInv(form) {
    if (editInv) { updateInvestment(editInv.id, form); setEditInv(null) }
    else addInvestment(form)
  }

  function handleCloseInvForm() { setShowInvForm(false); setEditInv(null) }

  function loadDemoInvestments() {
    if (investments.length > 0 && !confirm('This will replace your current positions with demo data. Continue?')) return
    loadInvestments(SEED_INVESTMENTS)
  }

  function handleUpdatePrice(inv) { setUpdatePriceInv(inv); setNewPrice(inv.currentPrice || '') }

  function submitPriceUpdate(e) {
    e.preventDefault()
    if (updatePriceInv) updateInvestment(updatePriceInv.id, { currentPrice: newPrice })
    setUpdatePriceInv(null)
    setNewPrice('')
  }

  const inputCls = 'bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 min-h-14">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-blue-400 font-bold text-lg tracking-tight">BT Speculation</span>
            {/* Section tabs */}
            <div className="flex bg-slate-700/60 rounded-lg p-0.5 gap-0.5 ml-1">
              <button onClick={() => setSection('trading')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === 'trading' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                Day Trading
              </button>
              <button onClick={() => setSection('investments')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === 'investments' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                <TrendingUp size={12} /> Investments
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {section === 'trading' && (
              <>
                <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setView('trades')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'trades' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <List size={13} /> Trades
                  </button>
                  <button onClick={() => setView('charts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'charts' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <BarChart2 size={13} /> Charts
                  </button>
                </div>
                {trades.length === 0 && (
                  <button onClick={loadDemoData}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <FlaskConical size={15} /> Demo Data
                  </button>
                )}
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <Plus size={15} /> Add Trade
                </button>
              </>
            )}

            {section === 'investments' && (
              <>
                <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setInvView('positions')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === 'positions' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <List size={13} /> Positions
                  </button>
                  <button onClick={() => setInvView('charts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === 'charts' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <BarChart2 size={13} /> Charts
                  </button>
                </div>
                {investments.length === 0 && (
                  <button onClick={loadDemoInvestments}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <FlaskConical size={15} /> Demo Data
                  </button>
                )}
                <button onClick={() => setShowInvForm(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <Plus size={15} /> Add Position
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {section === 'trading' && (
          <>
            <Dashboard trades={trades} />
            {view === 'trades'
              ? <TradeTable trades={trades} onDelete={deleteTrade} onEdit={handleEditTrade} />
              : <Charts trades={trades} />
            }
          </>
        )}

        {section === 'investments' && (
          <>
            <InvestmentDashboard investments={investments} />
            {invView === 'positions'
              ? <InvestmentTable investments={investments} onDelete={deleteInvestment} onEdit={handleEditInv} onUpdatePrice={handleUpdatePrice} />
              : <InvestmentCharts investments={investments} />
            }
          </>
        )}
      </main>

      {/* Trade Form Modal */}
      {showForm && (
        <TradeForm onAdd={handleSaveTrade} onClose={handleCloseTradeForm} initialTrade={editTrade} />
      )}

      {/* Investment Form Modal */}
      {showInvForm && (
        <InvestmentForm onAdd={handleSaveInv} onClose={handleCloseInvForm} initialInv={editInv} />
      )}

      {/* Quick Price Update Modal */}
      {updatePriceInv && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-slate-100 mb-1">Update Price</h3>
            <p className="text-sm text-slate-400 mb-4">{updatePriceInv.symbol} — {updatePriceInv.name}</p>
            <form onSubmit={submitPriceUpdate} className="space-y-3">
              <input type="number" step="0.0001" min="0" autoFocus className={`w-full ${inputCls}`}
                placeholder="Current price" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setUpdatePriceInv(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm font-medium">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
