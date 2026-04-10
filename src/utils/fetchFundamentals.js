const BASE = 'https://finnhub.io/api/v1'

async function get(path, key) {
  const res = await fetch(`${BASE}${path}&token=${key}`)
  if (!res.ok) throw new Error(`Finnhub ${path.split('?')[0]} failed (${res.status})`)
  return res.json()
}

export async function fetchFundamentals(symbol, apiKey) {
  const sym = symbol.toUpperCase()

  // Run all requests in parallel
  const [profile, quote, metrics, recs, targets, news, calendar] = await Promise.allSettled([
    get(`/stock/profile2?symbol=${sym}`, apiKey),
    get(`/quote?symbol=${sym}`, apiKey),
    get(`/stock/metric?symbol=${sym}&metric=all`, apiKey),
    get(`/stock/recommendation?symbol=${sym}`, apiKey),
    get(`/stock/price-target?symbol=${sym}`, apiKey),
    get(`/company-news?symbol=${sym}&from=${daysAgo(30)}&to=${today()}`, apiKey),
    get(`/stock/earnings?symbol=${sym}`, apiKey),
  ])

  return {
    profile:   profile.status   === 'fulfilled' ? profile.value  : null,
    quote:     quote.status     === 'fulfilled' ? quote.value    : null,
    metrics:   metrics.status   === 'fulfilled' ? metrics.value?.metric ?? null : null,
    recs:      recs.status      === 'fulfilled' ? (recs.value?.[0] ?? null) : null,
    targets:   targets.status   === 'fulfilled' ? targets.value  : null,
    news:      news.status      === 'fulfilled' ? (news.value?.slice(0, 8) ?? []) : [],
    earnings:  calendar.status  === 'fulfilled' ? calendar.value : null,
  }
}

export async function fetchPeers(symbol, apiKey) {
  const sym = symbol.toUpperCase()
  try {
    const data = await get(`/stock/peers?symbol=${sym}`, apiKey)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`Failed to fetch peers for ${sym}:`, error)
    return []
  }
}

function today() {
  return new Date().toISOString().split('T')[0]
}
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
