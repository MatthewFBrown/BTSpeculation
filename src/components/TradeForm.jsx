import { useState } from 'react'

const FUTURES_GROUPS = [
  { label: 'Equity Index',       symbols: ['/ES', '/NQ', '/YM', '/RTY'] },
  { label: 'Equity Micro',       symbols: ['/MES', '/MNQ', '/MYM', '/M2K'] },
  { label: 'Energy',             symbols: ['/CL', '/MCL', '/NG', '/RB', '/HO'] },
  { label: 'Metals',             symbols: ['/GC', '/MGC', '/SI', '/HG', '/MHG', '/PA', '/PL'] },
  { label: 'Bonds',              symbols: ['/ZB', '/ZN', '/ZF', '/ZT'] },
  { label: 'Forex',              symbols: ['/6E', '/M6E', '/6A', '/M6A', '/6B', '/M6B', '/6C', '/6S', '/6J'] },
  { label: 'Grains',             symbols: ['/ZC', '/ZS', '/ZW'] },
  { label: 'Other',              symbols: ['OTHER'] },
]

const EMPTY_OPTION = {
  type: 'option',
  symbol: '',
  optionType: 'call',
  strike: '',
  expiry: '',
  direction: 'long',
  quantity: '',
  entryPrice: '',
  exitPrice: '',
  entryDate: new Date().toISOString().slice(0, 10),
  exitDate: '',
  status: 'closed',
  fees: '',
  notes: '',
  chartLink: '',
}

const EMPTY_FUTURES = {
  type: 'futures',
  symbol: '/ES',
  direction: 'long',
  quantity: '',
  entryPrice: '',
  exitPrice: '',
  entryDate: new Date().toISOString().slice(0, 10),
  exitDate: '',
  status: 'closed',
  fees: '',
  notes: '',
  chartLink: '',
}

export default function TradeForm({ onAdd, onClose, initialTrade }) {
  const [tab, setTab] = useState(initialTrade?.type ?? 'option')
  const [form, setForm] = useState(initialTrade ?? (tab === 'option' ? EMPTY_OPTION : EMPTY_FUTURES))

  function switchTab(t) {
    setTab(t)
    setForm(t === 'option' ? EMPTY_OPTION : EMPTY_FUTURES)
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function submit(e) {
    e.preventDefault()
    onAdd(form)
    onClose()
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500'
  const labelCls = 'block text-xs text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Add Trade</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl">×</button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 mb-4">
            {['option', 'futures'].map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-4 py-1.5 rounded text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {/* Status */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Direction</label>
                <select className={inputCls} value={form.direction} onChange={e => set('direction', e.target.value)}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </div>
            </div>

            {tab === 'option' ? (
              <>
                <div>
                  <label className={labelCls}>Underlying Symbol</label>
                  <input className={inputCls} placeholder="e.g. SPY, AAPL" value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} required />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Call / Put</label>
                    <select className={inputCls} value={form.optionType} onChange={e => set('optionType', e.target.value)}>
                      <option value="call">Call</option>
                      <option value="put">Put</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Strike</label>
                    <input type="number" step="0.01" className={inputCls} placeholder="150" value={form.strike} onChange={e => set('strike', e.target.value)} required />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Expiry Date</label>
                    <input type="date" className={inputCls} value={form.expiry} onChange={e => set('expiry', e.target.value)} required />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Contracts</label>
                    <input type="number" min="1" className={inputCls} placeholder="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Symbol</label>
                    <select className={inputCls} value={form.symbol} onChange={e => set('symbol', e.target.value)}>
                      {FUTURES_GROUPS.map(group => (
                        <optgroup key={group.label} label={group.label}>
                          {group.symbols.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Contracts</label>
                    <input type="number" min="1" className={inputCls} placeholder="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* Prices */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Entry Price</label>
                <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Exit Price {form.status === 'open' && <span className="text-slate-500">(optional)</span>}</label>
                <input type="number" step="0.01" className={inputCls} placeholder="0.00" value={form.exitPrice} onChange={e => set('exitPrice', e.target.value)} required={form.status === 'closed'} />
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Entry Date</label>
                <input type="date" className={inputCls} value={form.entryDate} onChange={e => set('entryDate', e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Exit Date {form.status === 'open' && <span className="text-slate-500">(optional)</span>}</label>
                <input type="date" className={inputCls} value={form.exitDate} onChange={e => set('exitDate', e.target.value)} required={form.status === 'closed'} />
              </div>
            </div>

            {/* Fees, Chart Link & Notes */}
            <div>
              <label className={labelCls}>Commissions / Fees ($)</label>
              <input type="number" step="0.01" min="0" className={inputCls} placeholder="0.00" value={form.fees} onChange={e => set('fees', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Chart Link <span className="text-slate-500 normal-case">(screenshot, TradingView, Imgur…)</span></label>
              <input type="url" className={inputCls} placeholder="https://" value={form.chartLink} onChange={e => set('chartLink', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={2} className={inputCls} placeholder="Trade setup, mistakes, lessons..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded text-sm mt-2">
              Save Trade
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
