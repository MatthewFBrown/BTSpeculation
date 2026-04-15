import { useState, useRef, useEffect } from 'react'
import { Plus, X, Eye, BookOpen, BarChart2 } from 'lucide-react'
import { accountKey } from '../hooks/useAccounts'

const BASE_KEY = 'bt_watchlist'

function loadList(accountId) {
  try { return JSON.parse(localStorage.getItem(accountKey(BASE_KEY, accountId)) || '[]') } catch { return [] }
}
function saveList(list, accountId) {
  try { localStorage.setItem(accountKey(BASE_KEY, accountId), JSON.stringify(list)) } catch {}
}

// Module-level ref so addSymbolToWatchlist can be called from anywhere
let _addFn = null
export function addSymbolToWatchlist(sym) { _addFn?.(sym) }

export default function TickerTape({ onSendTo, accountId = 'default' }) {
  const [items, setItems]        = useState(() => loadList(accountId))
  const [showModal, setShowModal] = useState(false)
  const [input, setInput]        = useState('')
  const [popup, setPopup]        = useState(null)   // { sym, x, y }
  const popupRef                 = useRef(null)

  // Expose add function globally so external callers can auto-add symbols
  useEffect(() => {
    _addFn = (raw) => {
      const sym = raw.trim().toUpperCase()
      if (!sym) return
      setItems(prev => {
        if (prev.includes(sym)) return prev
        const next = [...prev, sym]
        saveList(next, accountId)
        return next
      })
    }
    return () => { _addFn = null }
  }, [accountId])

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

  function sendToFromModal(dest, sym) {
    if (onSendTo) onSendTo(dest, sym)
    setShowModal(false)
  }

  // Repeat 4x so the track always overflows the viewport — animation moves -25%
  const display = items.length > 0 ? [...items, ...items, ...items, ...items] : []

  return (
    <>
      {/* Tape bar */}
      {items.length > 0 && (
        <div className="border-b border-slate-700/60 overflow-hidden relative h-8 flex items-center">
          <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-[#0c1524] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#0c1524] to-transparent z-10 pointer-events-none" />
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
          className="fixed z-50 bg-slate-800 ring-1 ring-white/[0.08] rounded-xl shadow-2xl p-1 min-w-[168px]"
          style={{ top: popup.y, left: Math.max(8, Math.min(popup.x, window.innerWidth - 188)) }}
        >
          <div className="px-3 py-1.5 text-xs font-bold text-slate-200 font-mono border-b border-white/[0.06] mb-1">
            {popup.sym}
          </div>
          <button onClick={() => sendTo('research')}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-blue-600/80 hover:text-white rounded-lg transition-colors flex items-center gap-2">
            <BookOpen size={11} /> Research
          </button>
          <button onClick={() => sendTo('financials')}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-emerald-600/80 hover:text-white rounded-lg transition-colors flex items-center gap-2">
            <BarChart2 size={11} /> Financials
          </button>
          <div className="border-t border-white/[0.06] mt-1 pt-1">
            <button onClick={() => remove(popup.sym)}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5">
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      )}

      {/* Manage modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-sm flex flex-col max-h-[80vh]">

            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 ring-1 ring-blue-500/40 flex items-center justify-center">
                  <Eye size={14} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Watchlist</p>
                  <p className="text-xs text-slate-500 mt-0.5">{items.length} {items.length === 1 ? 'ticker' : 'tickers'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Add input */}
            <div className="px-5 pt-4 shrink-0">
              <form onSubmit={e => { e.preventDefault(); add(input) }} className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value.toUpperCase())}
                  placeholder="Add ticker…"
                  className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  autoFocus
                />
                <button type="submit" disabled={!input.trim()}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Plus size={14} />
                </button>
              </form>
            </div>

            {/* List */}
            <div className="px-5 py-4 flex-1 overflow-y-auto space-y-1 min-h-0">
              {items.length === 0 ? (
                <p className="text-center text-slate-600 text-sm py-8">No tickers yet.<br />Add one above.</p>
              ) : (
                items.map(sym => (
                  <div key={sym} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] group transition-colors">
                    <span className="font-mono font-bold text-slate-100 text-sm w-16 shrink-0">{sym}</span>
                    <div className="flex gap-1.5 flex-1">
                      <button
                        onClick={() => sendToFromModal('research', sym)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-700/60 hover:bg-blue-600 text-slate-400 hover:text-white ring-1 ring-white/[0.06] hover:ring-blue-500 transition-colors">
                        <BookOpen size={10} /> Research
                      </button>
                      <button
                        onClick={() => sendToFromModal('financials', sym)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-slate-700/60 hover:bg-emerald-600 text-slate-400 hover:text-white ring-1 ring-white/[0.06] hover:ring-emerald-500 transition-colors">
                        <BarChart2 size={10} /> Financials
                      </button>
                    </div>
                    <button onClick={() => remove(sym)}
                      className="text-slate-700 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      <div id="ticker-tape-opener" onClick={() => setShowModal(true)} style={{ display: 'none' }} />
    </>
  )
}

export function openWatchlistModal() {
  document.getElementById('ticker-tape-opener')?.click()
}
