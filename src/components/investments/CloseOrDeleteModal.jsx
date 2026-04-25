import { useState } from 'react'

export default function CloseOrDeleteModal({ inv, onClose, onDelete, onClosePosition }) {
  const today  = new Date().toISOString().slice(0, 10)
  const [sellPrice, setSellPrice] = useState('')
  const [sellDate,  setSellDate]  = useState(today)

  const isOption  = inv.assetType === 'Option'
  const contracts = parseFloat(inv.shares) || 0
  const strike    = parseFloat(inv.strike) || 0

  const inputCls = 'w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1'

  function handleClose() {
    onClosePosition(inv, { sellPrice, sellDate })
    onClose()
  }

  function handleDelete() {
    onDelete(inv.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-100">Close or Delete</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">×</button>
          </div>

          {/* Position summary */}
          <div className="bg-slate-900/60 rounded-lg p-3 mb-4 border border-slate-700/60 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Symbol</span>
              <span className="font-mono font-semibold text-slate-100">{inv.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>{isOption ? 'Contracts' : 'Shares'}</span>
              <span className="text-slate-200">{inv.shares}</span>
            </div>
            {isOption && strike > 0 && (
              <div className="flex justify-between">
                <span>Strike</span>
                <span className="text-slate-200">${strike.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{isOption ? 'Entry Premium' : 'Avg Cost'}</span>
              <span className="text-slate-200">${parseFloat(inv.avgCost || 0).toFixed(2)}</span>
            </div>
            {isOption && inv.expiry && (
              <div className="flex justify-between">
                <span>Expiry</span>
                <span className="text-slate-200">{inv.expiry}</span>
              </div>
            )}
          </div>

          {/* Close fields */}
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className={labelCls}>{isOption ? 'Exit Premium / share ($)' : 'Sell Price ($)'}</label>
              <input
                type="number" step="0.0001" min="0"
                value={sellPrice}
                onChange={e => setSellPrice(e.target.value)}
                placeholder={isOption ? '0.01' : '0.00'}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{isOption ? 'Close Date' : 'Sell Date'}</label>
              <input
                type="date"
                value={sellDate}
                onChange={e => setSellDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 bg-red-500/10 ring-1 ring-red-500/20 transition-colors"
            >
              Just Delete
            </button>
            <button
              onClick={handleClose}
              disabled={!sellPrice || !sellDate}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Close Position
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
