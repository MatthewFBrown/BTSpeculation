import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

function fromRow(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    symbol: r.symbol || '',
    name: r.name || '',
    assetType: r.asset_type || 'Stock',
    sector: r.sector || '',
    shares: r.shares != null ? String(r.shares) : '',
    avgCost: r.avg_cost != null ? String(r.avg_cost) : '',
    currentPrice: r.current_price != null ? String(r.current_price) : '',
    buyDate: r.buy_date || '',
    status: r.status || 'open',
    sellPrice: r.sell_price != null ? String(r.sell_price) : '',
    sellDate: r.sell_date || '',
    stopLoss: r.stop_loss != null ? String(r.stop_loss) : '',
    targetPrice: r.target_price != null ? String(r.target_price) : '',
    chartLink: r.chart_link || '',
    notes: r.notes || '',
    optionType: r.option_type || 'put',
    optionDirection: r.option_direction || 'short',
    strike: r.strike != null ? String(r.strike) : '',
    expiry: r.expiry || '',
  }
}

function toRow(inv) {
  return {
    symbol:           inv.symbol || null,
    name:             inv.name || null,
    asset_type:       inv.assetType || null,
    sector:           inv.sector || null,
    shares:           inv.shares !== '' ? parseFloat(inv.shares) : null,
    avg_cost:         inv.avgCost !== '' ? parseFloat(inv.avgCost) : null,
    current_price:    inv.currentPrice !== '' ? parseFloat(inv.currentPrice) : null,
    buy_date:         inv.buyDate || null,
    status:           inv.status || 'open',
    sell_price:       inv.sellPrice !== '' ? parseFloat(inv.sellPrice) : null,
    sell_date:        inv.sellDate || null,
    stop_loss:        inv.stopLoss !== '' ? parseFloat(inv.stopLoss) : null,
    target_price:     inv.targetPrice !== '' ? parseFloat(inv.targetPrice) : null,
    chart_link:       inv.chartLink || null,
    notes:            inv.notes || null,
    option_type:      inv.optionType || null,
    option_direction: inv.optionDirection || null,
    strike:           inv.strike !== '' ? parseFloat(inv.strike) : null,
    expiry:           inv.expiry || null,
  }
}

export function useInvestments(accountId, userId) {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(false)
  const accountIdRef = useRef(accountId)

  useEffect(() => {
    if (!accountId) return
    accountIdRef.current = accountId
    setLoading(true)

    supabase
      .from('investments')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Failed to load investments:', error); setLoading(false); return }
        if (accountIdRef.current === accountId) {
          setInvestments((data || []).map(fromRow))
          setLoading(false)
        }
      })
  }, [accountId])

  async function addInvestment(inv) {
    const { id: _id, createdAt: _c, ...rest } = inv
    const { data, error } = await supabase
      .from('investments')
      .insert({ account_id: accountId, user_id: userId, ...toRow(rest) })
      .select()
      .single()
    if (error) { console.error('Failed to add investment:', error); return }
    if (data) setInvestments(prev => [fromRow(data), ...prev])
  }

  async function updateInvestment(id, updates) {
    const existing = investments.find(i => i.id === id)
    if (!existing) return
    const { id: _id, createdAt: _c, ...rest } = existing
    const merged = { ...rest, ...updates }
    const { error } = await supabase.from('investments').update(toRow(merged)).eq('id', id)
    if (!error) setInvestments(prev => prev.map(i => i.id === id ? { id, createdAt: i.createdAt, ...merged } : i))
  }

  async function deleteInvestment(id) {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  async function loadInvestments(list) {
    await supabase.from('investments').delete().eq('account_id', accountId)
    if (list.length === 0) { setInvestments([]); return }
    const rows = list.map(({ id: _id, createdAt: _c, ...rest }) => ({
      account_id: accountId,
      user_id: userId,
      ...toRow(rest),
    }))
    const { data } = await supabase.from('investments').insert(rows).select()
    if (data) setInvestments(data.map(fromRow))
    else setInvestments(list)
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments, loading }
}
