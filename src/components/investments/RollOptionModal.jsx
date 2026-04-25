import { useState } from 'react'

export default function RollOptionModal({ inv, onRoll, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    buybackPrice: '',
    closeDate: today,
    newExpiry: '',
    newPremium: '',
    newStrike: inv.strike || '',
  })

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function submit(e) {
    e.preventDefault()
    onRoll(inv, form)
    onClose()
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500'
  const labelCls = 'block text-xs text-slate-400 mb-1'
  const strike   = parseFloat(inv.strike) || 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Roll Option</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">×</button>
          </div>

          {/* Current position summary */}
          <div className="bg-slate-900/60 rounded-lg p-3 mb-4 border border-slate-700/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-slate-100">{inv.symbol}</span>
              {inv.optionType && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                  {inv.optionDirection} {inv.optionType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {inv.shares} contract{inv.shares != 1 ? 's' : ''}
              {strike > 0 && <> · Strike ${strike.toFixed(2)}</>}
              {inv.expiry && <> · Exp {inv.expiry}</>}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Close current contract */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">Close Current Contract</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Bought back at ($/share)</label>
                  <input type="number" step="0.0001" min="0" className={inputCls}
                    placeholder="0.05" value={form.buybackPrice}
                    onChange={e => set('buybackPrice', e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Close Date</label>
                  <input type="date" className={inputCls} value={form.closeDate}
                    onChange={e => set('closeDate', e.target.value)} required />
                </div>
              </div>
            </div>

            {/* New contract */}
            <div className="border-t border-slate-700/60 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-3">New Contract</p>
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className={labelCls}>New Expiry</label>
                  <input type="date" className={inputCls} value={form.newExpiry}
                    onChange={e => set('newExpiry', e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Premium Received ($/share)</label>
                  <input type="number" step="0.0001" min="0" className={inputCls}
                    placeholder="2.50" value={form.newPremium}
                    onChange={e => set('newPremium', e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  New Strike ($) <span className="text-slate-500">optional — leave blank to keep ${strike.toFixed(2)}</span>
                </label>
                <input type="number" step="0.01" min="0" className={inputCls}
                  placeholder={strike.toFixed(2)} value={form.newStrike}
                  onChange={e => set('newStrike', e.target.value)} />
              </div>
            </div>

            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded text-sm transition-colors">
              Roll Position
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
