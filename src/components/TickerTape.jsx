import { useState, useRef, useEffect } from 'react'
import { Plus, X, Eye } from 'lucide-react'
import { accountKey } from '../hooks/useAccounts'

const BASE_KEY = 'bt_watchlist'

function loadList(accountId) {
  try { return JSON.parse(localStorage.getItem(accountKey(BASE_KEY, accountId)) || '[]') } catch { return [] }
}
function saveList(list, accountId) {
  try { localStorage.setItem(accountKey(BASE_KEY, accountId), JSON.stringify(list)) } catch {}
}

const SUGGESTIONS = [
  'AAPL','GOOGL','AMZN','TSLA','NVDA','META','AMD',
  'NFLX','V','JPM','BRK.B','UNH','XOM','WMT','COIN',
]

export default function TickerTape({ onSendTo, accountId = 'default' }) {
  const [items, setItems]       = useState(() => loadList(accountId))
  const [showModal, setShowModal] = useState(false)
  const [input, setInput]       = useState('')
  const [popup, setPopup]       = useState(null)   // { sym, x, y }
  const popupRef                = useRef(null)

  // Reload watchlist when account switches
  useEffect(() => {
    setItems(loadList(accountId))
  }, [accountId])

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return
    function handle(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) setPopup(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [popup])

  function add(raw) {
    const sym = raw.trim().toUpperCase()
    if (!sym || items.includes(sym)) return
    const next = [...items, sym]
    setItems(next)
    saveList(next, accountId)
    setInput('')
  }

  function remove(sym) {
    const next = items.filter(s => s !== sym)
    setItems(next)
    saveList(next, accountId)
    setPopup(null)
  }

  function handleChipClick(e, sym) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopup({ sym, x: rect.left, y: rect.bottom + 6 })
  }

  function sendTo(dest) {
    if (onSendTo && popup) onSendTo(dest, popup.sym)
    setPopup(null)
  }

  // Duplicate items so the scroll loops seamlessly
  const display = items.length > 0 ? [...items, ...items] : []
  const suggestions = SUGGESTIONS.filter(s => !items.includes(s))

  return (
    <>
      {/* Tape bar — only shown when there are items */}
      {items.length > 0 && (
        <div className="border-b border-slate-700/60 bg-slate-800/40 overflow-hidden relative h-8 flex items-center">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

          <div className="ticker-track">
            {display.map((sym, i) => (
              <button
                key={i}
                onClick={e => handleChipClick(e, sym)}
                className="flex items-center gap-2 px-4 text-xs font-mono font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap group"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-blue-400 transition-colors" />
                {sym}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click popup */}
      {popup && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-1 min-w-[160px]"
          style={{ top: popup.y, left: Math.min(popup.x, window.innerWidth - 180) }}
        >
          <div className="px-3 py-1.5 text-xs font-bold text-slate-300 font-mono border-b border-slate-700 mb-1">
            {popup.sym}
          </div>
          <button onClick={() => sendTo('research')}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg transition-colors">
            Open in Research
          </button>
          <button onClick={() => sendTo('financials')}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors">
            Open in Financials
          </button>
          <div className="border-t border-slate-700 mt-1 pt-1">
            <button onClick={() => remove(popup.sym)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5">
              <X size={11} /> Remove from watchlist
            </button>
          </div>
        </div>
      )}

      {/* Manage modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Eye size={15} className="text-blue-400" /> Watchlist
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200">
                <X size={16} />
              </button>
            </div>

            {/* Add input */}
            <form onSubmit={e => { e.preventDefault(); add(input) }} className="flex gap-2 mb-4">
              <input
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                placeholder="Add ticker e.g. AAPL"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
                autoFocus
              />
              <button type="submit" disabled={!input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Plus size={14} />
              </button>
            </form>

            {/* Current watchlist */}
            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {items.map(sym => (
                  <div key={sym}
                    className="flex items-center gap-1.5 bg-slate-700 border border-slate-600 rounded-lg pl-3 pr-1.5 py-1">
                    <span className="text-sm font-mono font-semibold text-slate-200">{sym}</span>
                    <button onClick={() => remove(sym)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Quick add</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.slice(0, 10).map(s => (
                    <button key={s} onClick={() => add(s)}
                      className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 border border-slate-600 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setShowModal(false)}
              className="mt-5 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm font-medium">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Expose open function via a trigger button rendered in the header */}
      {/* We use a custom event so App.jsx can wire the button */}
      <div id="ticker-tape-opener" onClick={() => setShowModal(true)} style={{ display: 'none' }} />
    </>
  )
}

// Helper so App.jsx header button can open the modal
export function openWatchlistModal() {
  document.getElementById('ticker-tape-opener')?.click()
}
