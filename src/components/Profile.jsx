import { useState } from 'react'
import { X, User, KeyRound, LogOut, Copy, Check } from 'lucide-react'

const inputCls = "w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"

export default function Profile({ user, activeAccount, displayName, onSaveDisplayName, finnhubKey, avKey, onSaveKeys, onSignOut, onClose }) {
  const [fk, setFk] = useState(finnhubKey || '')
  const [ak, setAk] = useState(avKey || '')
  const [name, setName] = useState(displayName || '')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleSave() {
    onSaveKeys({ finnhubKey: fk.trim(), avKey: ak.trim() })
    if (name.trim() !== displayName) onSaveDisplayName(name.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyId() {
    navigator.clipboard.writeText(user?.id || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-sm flex flex-col">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/20 ring-1 ring-blue-500/40 flex items-center justify-center">
              <User size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{user?.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">{activeAccount?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* User ID */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1.5">Your User ID</label>
            <div className="flex items-center gap-2">
              <span className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate">
                {user?.id}
              </span>
              <button
                onClick={copyId}
                title="Copy ID"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-slate-700/60 hover:bg-slate-700 ring-1 ring-white/10 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Matt"
              className={inputCls}
            />
          </div>

          <div className="border-t border-white/[0.05]" />

          {/* API Keys */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 flex items-center gap-1.5">
            <KeyRound size={11} /> API Keys
          </p>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1.5">Finnhub</label>
            <p className="text-[11px] text-slate-600 mb-1.5">Price refresh · Fundamentals · Research — free at finnhub.io</p>
            <input
              type="text"
              value={fk}
              onChange={e => setFk(e.target.value)}
              placeholder="Finnhub API key…"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1.5">Alpha Vantage</label>
            <p className="text-[11px] text-slate-600 mb-1.5">Financial Statements tab — free at alphavantage.co · 25 req/day</p>
            <input
              type="text"
              value={ak}
              onChange={e => setAk(e.target.value)}
              placeholder="Alpha Vantage API key…"
              className={inputCls}
            />
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Sign out */}
        <div className="px-5 pb-5 border-t border-white/[0.05] pt-4">
          <button
            onClick={() => { onSignOut(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 ring-1 ring-red-500/20 transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

      </div>
    </div>
  )
}
