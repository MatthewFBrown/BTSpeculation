import { useState } from 'react'
import { SECTORS, ASSET_TYPES } from '../../utils/investmentCalcs'
import { X } from 'lucide-react'

const EMPTY = {
  symbol: '',
  name: '',
  assetType: 'Stock',
  sector: 'Technology',
  shares: '',
  avgCost: '',
  currentPrice: '',
  buyDate: new Date().toISOString().slice(0, 10),
  status: 'open',
  sellPrice: '',
  sellDate: '',
  stopLoss: '',
  targetPrice: '',
  chartLink: '',
  notes: '',
  optionType: 'put',
  optionDirection: 'short',
  strike: '',
  expiry: '',
}

export default function InvestmentForm({ onAdd, onClose, initialInv }) {
  const [form, setForm] = useState(initialInv ?? EMPTY)
  const isClosed = form.status === 'closed'

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function submit(e) {
    e.preventDefault()
    onAdd(form)
    onClose()
  }

  const inputCls = 'w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <span className="font-semibold text-white text-sm">
              {initialInv ? (isClosed ? 'Edit Closed Position' : 'Edit Position') : 'Add Position'}
            </span>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {/* Symbol + Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Symbol</label>
                <input className={inputCls} placeholder="AAPL" value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} required />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Name <span className="text-slate-600 normal-case font-normal tracking-normal">(optional)</span></label>
                <input className={inputCls} placeholder="Apple Inc." value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
            </div>

            {/* Type + Sector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Asset Type</label>
                <select className={inputCls} value={form.assetType} onChange={e => set('assetType', e.target.value)}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sector</label>
                <select className={inputCls} value={form.sector} onChange={e => set('sector', e.target.value)}>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Option-specific fields */}
            {form.assetType === 'Option' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Put / Call</label>
                    <select className={inputCls} value={form.optionType} onChange={e => set('optionType', e.target.value)}>
                      <option value="put">Put</option>
                      <option value="call">Call</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Direction</label>
                    <select className={inputCls} value={form.optionDirection} onChange={e => set('optionDirection', e.target.value)}>
                      <option value="short">Short (sell)</option>
                      <option value="long">Long (buy)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Strike ($)</label>
                    <input type="number" step="0.01" className={inputCls} placeholder="150.00" value={form.strike} onChange={e => set('strike', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Expiry Date</label>
                    <input type="date" className={inputCls} value={form.expiry} onChange={e => set('expiry', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* Contracts / Shares + Avg Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{form.assetType === 'Option' ? 'Contracts' : 'Shares / Units'}</label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder={form.assetType === 'Option' ? '1' : '10'} value={form.shares} onChange={e => set('shares', e.target.value)} required />
              </div>
              <div>
                <label className={labelCls}>{form.assetType === 'Option' ? 'Premium / Share ($)' : 'Avg Cost / Unit ($)'}</label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder={form.assetType === 'Option' ? '2.50' : '150.00'} value={form.avgCost} onChange={e => set('avgCost', e.target.value)} required />
              </div>
            </div>

            {/* Buy Date */}
            <div>
              <label className={labelCls}>Buy Date</label>
              <input type="date" className={inputCls} value={form.buyDate} onChange={e => set('buyDate', e.target.value)} required />
            </div>

            {isClosed ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{form.assetType === 'Option' ? 'Exit Premium / Share ($)' : 'Sell Price ($)'}</label>
                  <input type="number" step="0.0001" min="0" className={inputCls} placeholder="0.00" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} required />
                </div>
                <div>
                  <label className={labelCls}>{form.assetType === 'Option' ? 'Close Date' : 'Sell Date'}</label>
                  <input type="date" className={inputCls} value={form.sellDate} onChange={e => set('sellDate', e.target.value)} required />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className={labelCls}>
                    {form.assetType === 'Option' ? 'Current Premium / Share ($)' : 'Current Price ($)'}
                    <span className="text-slate-600 normal-case font-normal tracking-normal"> — update manually</span>
                  </label>
                  <input type="number" step="0.0001" min="0" className={inputCls} placeholder={form.assetType === 'Option' ? '1.20' : '175.00'} value={form.currentPrice} onChange={e => set('currentPrice', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Stop Loss ($) <span className="text-slate-600 normal-case font-normal tracking-normal">(opt)</span></label>
                    <input type="number" step="0.0001" min="0" className={inputCls} placeholder="140.00" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Target ($) <span className="text-slate-600 normal-case font-normal tracking-normal">(opt)</span></label>
                    <input type="number" step="0.0001" min="0" className={inputCls} placeholder="200.00" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* Chart Link */}
            <div>
              <label className={labelCls}>Chart Link <span className="text-slate-600 normal-case font-normal tracking-normal">(optional)</span></label>
              <input type="url" className={inputCls} placeholder="https://" value={form.chartLink} onChange={e => set('chartLink', e.target.value)} />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes / Thesis</label>
              <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Why you bought it, catalysts, exit plan…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                Save Position
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
