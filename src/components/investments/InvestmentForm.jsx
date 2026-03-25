import { useState } from 'react'
import { SECTORS, ASSET_TYPES } from '../../utils/investmentCalcs'

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
}

export default function InvestmentForm({ onAdd, onClose, initialInv }) {
  const [form, setForm] = useState(initialInv ?? EMPTY)

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
            <h2 className="text-lg font-semibold text-slate-100">
              {initialInv ? 'Edit Position' : 'Add Position'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl">×</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {/* Symbol + Name */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-1/3">
                <label className={labelCls}>Symbol</label>
                <input className={inputCls} placeholder="AAPL" value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} required />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Name <span className="text-slate-500">(optional)</span></label>
                <input className={inputCls} placeholder="Apple Inc." value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
            </div>

            {/* Type + Sector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Asset Type</label>
                <select className={inputCls} value={form.assetType} onChange={e => set('assetType', e.target.value)}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Sector</label>
                <select className={inputCls} value={form.sector} onChange={e => set('sector', e.target.value)}>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <div className="flex gap-2">
                {['open', 'closed'].map(s => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${form.status === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Shares + Avg Cost */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Shares / Units</label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder="10" value={form.shares} onChange={e => set('shares', e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Avg Cost / Unit ($)</label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder="150.00" value={form.avgCost} onChange={e => set('avgCost', e.target.value)} required />
              </div>
            </div>

            {/* Current Price (open) or Sell Price (closed) */}
            {form.status === 'open' ? (
              <div>
                <label className={labelCls}>Current Price ($) <span className="text-slate-500">update manually</span></label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder="175.00" value={form.currentPrice} onChange={e => set('currentPrice', e.target.value)} />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Sell Price ($)</label>
                  <input type="number" step="0.0001" min="0" className={inputCls} placeholder="200.00" value={form.sellPrice} onChange={e => set('sellPrice', e.target.value)} required />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Sell Date</label>
                  <input type="date" className={inputCls} value={form.sellDate} onChange={e => set('sellDate', e.target.value)} required />
                </div>
              </div>
            )}

            {/* Buy Date */}
            <div>
              <label className={labelCls}>Buy Date</label>
              <input type="date" className={inputCls} value={form.buyDate} onChange={e => set('buyDate', e.target.value)} required />
            </div>

            {/* Stop Loss + Target */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className={labelCls}>Stop Loss ($) <span className="text-slate-500">(optional)</span></label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder="140.00" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Target ($) <span className="text-slate-500">(optional)</span></label>
                <input type="number" step="0.0001" min="0" className={inputCls} placeholder="200.00" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} />
              </div>
            </div>

            {/* Chart Link */}
            <div>
              <label className={labelCls}>Chart Link <span className="text-slate-500">(screenshot, TradingView…)</span></label>
              <input type="url" className={inputCls} placeholder="https://" value={form.chartLink} onChange={e => set('chartLink', e.target.value)} />
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>Notes / Thesis</label>
              <textarea rows={2} className={inputCls} placeholder="Why you bought it, catalysts, exit plan..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded text-sm mt-2">
              Save Position
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
