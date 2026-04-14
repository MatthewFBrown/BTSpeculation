import { supabase } from './supabase'

export async function getSharedCache(ticker) {
  const { data } = await supabase
    .from('financials_cache')
    .select('data')
    .eq('ticker', ticker.toUpperCase())
    .maybeSingle()
  return data?.data ?? null
}

export async function saveSharedCache(ticker, data) {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('financials_cache')
    .upsert(
      { ticker: ticker.toUpperCase(), data, fetched_at: new Date().toISOString(), user_id: user?.id ?? null },
      { onConflict: 'ticker' }
    )
}

export async function getAllSharedCache() {
  const { data } = await supabase
    .from('financials_cache')
    .select('ticker, data')
  if (!data) return {}
  return Object.fromEntries(data.map(r => [r.ticker, r.data]))
}
