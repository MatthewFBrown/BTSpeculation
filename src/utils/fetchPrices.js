// CoinGecko symbol → id map (no API key needed)
const COINGECKO_IDS = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  SOL:  'solana',
  BNB:  'binancecoin',
  XRP:  'ripple',
  ADA:  'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT:  'polkadot',
  MATIC:'matic-network',
}

async function fetchCrypto(symbols) {
  const ids = symbols.map(s => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean)
  if (!ids.length) return {}
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`
  const res = await fetch(url)
  if (!res.ok) throw new Error('CoinGecko request failed')
  const data = await res.json()
  const result = {}
  symbols.forEach(s => {
    const id = COINGECKO_IDS[s.toUpperCase()]
    if (id && data[id]?.usd) result[s.toUpperCase()] = data[id].usd
  })
  return result
}

async function fetchStock(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub failed for ${symbol}`)
  const data = await res.json()
  if (!data.c || data.c === 0) throw new Error(`No price returned for ${symbol}`)
  return data.c  // current price
}

// Returns { symbol: price, ... } for all open positions
// Skips closed. Skips anything without a price returned.
export async function fetchAllPrices(investments, finnhubKey, onProgress) {
  const open = investments.filter(i => i.status === 'open' && i.assetType !== 'Option')
  const cryptoSymbols = open.filter(i => COINGECKO_IDS[i.symbol?.toUpperCase()]).map(i => i.symbol)
  const stockSymbols  = open.filter(i => !COINGECKO_IDS[i.symbol?.toUpperCase()]).map(i => i.symbol)

  const results = {}
  const errors  = []

  // Crypto — single batch call
  if (cryptoSymbols.length) {
    try {
      const prices = await fetchCrypto(cryptoSymbols)
      Object.assign(results, prices)
    } catch (e) {
      errors.push('CoinGecko: ' + e.message)
    }
    onProgress?.()
  }

  // Stocks — sequential to respect rate limits
  for (const sym of stockSymbols) {
    if (!finnhubKey) { errors.push(`${sym}: no Finnhub API key`); continue }
    try {
      const price = await fetchStock(sym, finnhubKey)
      results[sym.toUpperCase()] = price
    } catch (e) {
      errors.push(e.message)
    }
    onProgress?.()
    // small delay between calls to avoid hitting rate limits
    await new Promise(r => setTimeout(r, 150))
  }

  return { prices: results, errors }
}
