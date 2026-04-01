const BASE      = '/yahoo-proxy/v8/finance/chart'
const CACHE_KEY = 'bt_returns_cache_v2'  // bumped: 2yr window
const CACHE_TTL = 24 * 3600 * 1000   // 24 hours

// ── localStorage cache for weekly return arrays ───────────────
function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    if (Date.now() - (c._ts || 0) > CACHE_TTL) return {}
    return c
  } catch { return {} }
}

function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, _ts: Date.now() })) } catch {}
}

// ── Fetch 1 year of weekly closes → weekly returns ────────────
async function fetchWeeklyReturns(symbol) {
  const res = await fetch(`${BASE}/${symbol}?interval=1wk&range=2y`)
  if (!res.ok) return null
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return null
  const closes = result.indicators?.quote?.[0]?.close
  if (!closes || closes.length < 5) return null

  const returns = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] != null && closes[i - 1] != null && closes[i - 1] !== 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }
  }
  return returns.length >= 8 ? returns : null
}

// ── Pearson correlation ───────────────────────────────────────
function pearson(a, b) {
  const n = Math.min(a.length, b.length)
  if (n < 8) return null
  const x = a.slice(-n)
  const y = b.slice(-n)
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my)
    dx  += (x[i] - mx) ** 2
    dy  += (y[i] - my) ** 2
  }
  const denom = Math.sqrt(dx * dy)
  return denom === 0 ? 0 : +(num / denom).toFixed(3)
}

// ── Compute annualised return + vol from weekly returns ───────
function computeAssetParams(returns) {
  const n = returns.length
  if (n < 8) return null

  // Annual vol = sample std of weekly returns × √52
  const mean = returns.reduce((s, r) => s + r, 0) / n
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)
  const annualVol = Math.sqrt(variance) * Math.sqrt(52)

  // Annual return = arithmetic mean of weekly returns × 52 (correct for MPT)
  const annualReturn = mean * 52

  return { r: +annualReturn.toFixed(4), s: +annualVol.toFixed(4) }
}

// ── Public: fetch correlations for a list of symbols ─────────
// Returns { corrMap, paramsMap }
//   corrMap:  { SYM1: { SYM2: 0.72, ... }, ... }
//   paramsMap: { SYM1: { r: 0.15, s: 0.22 }, ... }
// Skips crypto — Yahoo Finance weekly data unreliable for crypto
const CRYPTO = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','DOT','MATIC','SHIB','LTC'])

export async function fetchCorrelations(symbols) {
  const stockSymbols = symbols.filter(s => !CRYPTO.has(s.toUpperCase()))
  if (stockSymbols.length < 2) return { corrMap: {}, paramsMap: {} }

  const cache = loadCache()

  const toFetch = stockSymbols.filter(s => !cache[s])
  if (toFetch.length > 0) {
    for (const sym of toFetch) {
      const returns = await fetchWeeklyReturns(sym)
      if (returns) cache[sym] = returns
      if (toFetch.length > 3) await new Promise(r => setTimeout(r, 120))
    }
    saveCache(cache)
  }

  // Build pairwise correlation map
  const corrMap = {}
  for (const s1 of stockSymbols) {
    corrMap[s1] = {}
    for (const s2 of stockSymbols) {
      if (s1 === s2) { corrMap[s1][s2] = 1.0; continue }
      const r1 = cache[s1], r2 = cache[s2]
      corrMap[s1][s2] = (r1 && r2) ? (pearson(r1, r2) ?? 0.5) : 0.5
    }
  }

  // Compute annualised return + vol for each symbol with data
  const paramsMap = {}
  for (const sym of stockSymbols) {
    if (cache[sym]) {
      const p = computeAssetParams(cache[sym])
      if (p) paramsMap[sym] = p
    }
  }

  return { corrMap, paramsMap }
}

export function clearCorrelationCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem('bt_returns_cache')  // remove old 1yr key too
}
