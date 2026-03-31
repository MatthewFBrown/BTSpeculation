const RISK_FREE = 0.045

const ASSET_PARAMS = {
  AAPL:  { r: 0.15, s: 0.25, cat: 'tech' },
  NVDA:  { r: 0.38, s: 0.55, cat: 'tech' },
  MSFT:  { r: 0.18, s: 0.22, cat: 'tech' },
  META:  { r: 0.30, s: 0.40, cat: 'tech' },
  AMZN:  { r: 0.20, s: 0.30, cat: 'tech' },
  GOOGL: { r: 0.18, s: 0.25, cat: 'tech' },
  AMD:   { r: 0.30, s: 0.55, cat: 'tech' },
  TSLA:  { r: 0.20, s: 0.65, cat: 'tech' },
  SMH:   { r: 0.25, s: 0.35, cat: 'tech' },
  SPY:   { r: 0.12, s: 0.17, cat: 'etf_eq' },
  QQQ:   { r: 0.16, s: 0.22, cat: 'etf_eq' },
  TLT:   { r: 0.03, s: 0.13, cat: 'bond' },
  GLD:   { r: 0.08, s: 0.15, cat: 'gold' },
  XOM:   { r: 0.10, s: 0.22, cat: 'energy' },
  BTC:   { r: 0.50, s: 0.80, cat: 'crypto' },
  ETH:   { r: 0.45, s: 0.85, cat: 'crypto' },
  JPM:   { r: 0.13, s: 0.22, cat: 'financial' },
  SOFI:  { r: 0.15, s: 0.55, cat: 'financial' },
}

const DEFAULT_PARAMS = { r: 0.12, s: 0.28, cat: 'other' }

const CAT_CORR = {
  tech:      { tech: 0.65, etf_eq: 0.78, bond: -0.10, gold: 0.05, crypto: 0.25, energy: 0.25, financial: 0.55, other: 0.50 },
  etf_eq:    { tech: 0.78, etf_eq: 0.90, bond: -0.10, gold: 0.08, crypto: 0.25, energy: 0.35, financial: 0.70, other: 0.55 },
  bond:      { tech: -0.10, etf_eq: -0.10, bond: 0.85, gold: 0.15, crypto: -0.05, energy: -0.05, financial: 0.20, other: 0.00 },
  gold:      { tech: 0.05, etf_eq: 0.08, bond: 0.15, gold: 1.00, crypto: 0.15, energy: 0.25, financial: 0.10, other: 0.10 },
  crypto:    { tech: 0.25, etf_eq: 0.25, bond: -0.05, gold: 0.15, crypto: 0.80, energy: 0.15, financial: 0.20, other: 0.20 },
  energy:    { tech: 0.25, etf_eq: 0.35, bond: -0.05, gold: 0.25, crypto: 0.15, energy: 0.80, financial: 0.40, other: 0.30 },
  financial: { tech: 0.55, etf_eq: 0.70, bond: 0.20, gold: 0.10, crypto: 0.20, energy: 0.40, financial: 0.70, other: 0.40 },
  other:     { tech: 0.50, etf_eq: 0.55, bond: 0.00, gold: 0.10, crypto: 0.20, energy: 0.30, financial: 0.40, other: 0.60 },
}

export function getAssetParams(symbol) {
  return ASSET_PARAMS[symbol?.toUpperCase()] || DEFAULT_PARAMS
}

function getCorrelation(sym1, sym2) {
  if (sym1 === sym2) return 1.0
  const c1 = getAssetParams(sym1).cat
  const c2 = getAssetParams(sym2).cat
  return CAT_CORR[c1]?.[c2] ?? 0.50
}

function randomWeights(n) {
  const vals = Array.from({ length: n }, () => -Math.log(Math.random() + 1e-10))
  const sum = vals.reduce((a, b) => a + b, 0)
  return vals.map(v => v / sum)
}

// paramsArr is optional — if provided, overrides getAssetParams for those symbols
function portfolioStats(symbols, weights, paramsArr = null) {
  const params = paramsArr || symbols.map(s => getAssetParams(s))
  const n = symbols.length
  const ret = weights.reduce((acc, w, i) => acc + w * params[i].r, 0)
  let variance = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * params[i].s * params[j].s * getCorrelation(symbols[i], symbols[j])
    }
  }
  const vol = Math.sqrt(Math.max(variance, 0))
  const sharpe = vol > 0 ? (ret - RISK_FREE) / vol : 0
  return { ret, vol, sharpe }
}

// Extract the efficient frontier: for each volatility bucket, keep only the
// max-return portfolio, then apply a Pareto filter so no dominated point remains.
function extractFrontier(all, numBuckets = 150) {
  if (!all.length) return []
  const vols = all.map(p => p.vol)
  const lo = Math.min(...vols), hi = Math.max(...vols)
  const range = hi - lo
  if (range === 0) return [all[0]]

  // Step 1: bucket by vol, keep only the max-return portfolio per bucket
  const buckets = {}
  for (const p of all) {
    const idx = Math.min(Math.floor(((p.vol - lo) / range) * (numBuckets - 1)), numBuckets - 1)
    if (!buckets[idx] || p.ret > buckets[idx].ret) buckets[idx] = p
  }

  // Step 2: sort by vol ascending, then keep only points where return
  // is strictly increasing — this selects the upper (efficient) half of
  // the Markowitz bullet and discards the dominated lower half.
  let maxRet = -Infinity
  const frontier = []
  for (const p of Object.values(buckets).sort((a, b) => a.vol - b.vol)) {
    if (p.ret > maxRet) { maxRet = p.ret; frontier.push(p) }
  }
  return frontier
}

export function generateEfficientFrontierData(investments, paramsOverride = {}) {
  const open = investments.filter(i =>
    i.status === 'open' && parseFloat(i.shares) > 0 && parseFloat(i.avgCost) > 0
  )
  if (open.length < 2) return { frontier: [], current: null, minVol: null, maxSharpe: null }

  const symbols = open.map(i => i.symbol)
  const mvs = open.map(i => (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0))
  const totalMV = mvs.reduce((a, b) => a + b, 0)
  const currentWeights = mvs.map(v => v / totalMV)

  // Merge user overrides with defaults for each symbol
  const paramsArr = symbols.map(sym => {
    const base = getAssetParams(sym)
    const over = paramsOverride[sym] || {}
    return { ...base, r: over.r ?? base.r, s: over.s ?? base.s, cat: base.cat }
  })

  const all = []
  let minVolPt = null, maxSharpePt = null
  let minVolWeights = null, maxSharpeWeights = null

  for (let k = 0; k < 10000; k++) {
    const w = randomWeights(symbols.length)
    const { ret, vol, sharpe } = portfolioStats(symbols, w, paramsArr)
    // store weights on every point so extractFrontier can propagate them
    const pt = { ret: +(ret * 100).toFixed(2), vol: +(vol * 100).toFixed(2), sharpe: +sharpe.toFixed(3), _w: w }
    all.push(pt)
    if (!minVolPt || pt.vol < minVolPt.vol) { minVolPt = pt; minVolWeights = w }
    if (!maxSharpePt || pt.sharpe > maxSharpePt.sharpe) { maxSharpePt = pt; maxSharpeWeights = w }
  }

  function buildAllocation(weights) {
    return symbols
      .map((sym, i) => ({ symbol: sym, weight: +(weights[i] * 100).toFixed(1) }))
      .sort((a, b) => b.weight - a.weight)
  }

  // Add allocation to each frontier point, then strip the raw weights
  const frontier = extractFrontier(all).map(pt => ({
    ret: pt.ret, vol: pt.vol, sharpe: pt.sharpe,
    allocation: buildAllocation(pt._w),
  }))

  const cur = portfolioStats(symbols, currentWeights, paramsArr)
  const current = {
    ret: +(cur.ret * 100).toFixed(2),
    vol: +(cur.vol * 100).toFixed(2),
    sharpe: +cur.sharpe.toFixed(3),
    allocation: buildAllocation(currentWeights),
  }

  return {
    frontier,
    current,
    minVol:    minVolPt    ? { ...minVolPt,    allocation: buildAllocation(minVolWeights) }    : null,
    maxSharpe: maxSharpePt ? { ...maxSharpePt, allocation: buildAllocation(maxSharpeWeights) } : null,
  }
}

// Returns default params for a list of symbols (for display in the editor)
export function getDefaultParams(symbols) {
  return symbols.map(sym => {
    const p = getAssetParams(sym)
    return { symbol: sym, r: p.r, s: p.s }
  })
}

export function getPortfolioRiskMetrics(investments) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  if (open.length === 0) return null

  const mvs = open.map(i => ({
    symbol: i.symbol,
    mv: (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0),
    stopLoss: parseFloat(i.stopLoss) || null,
    currentPrice: parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0,
    shares: parseFloat(i.shares) || 0,
  }))
  const totalMV = mvs.reduce((a, b) => a + b.mv, 0)

  // HHI concentration
  const weights = mvs.map(p => p.mv / totalMV)
  const hhi = weights.reduce((acc, w) => acc + w * w, 0)
  const diversificationScore = Math.round((1 - hhi) * 100)

  // Largest position
  const sorted = [...mvs].sort((a, b) => b.mv - a.mv)
  const topPosition = sorted[0]
  const topWeight = (topPosition.mv / totalMV) * 100

  // Stop loss coverage
  const withStop = open.filter(i => parseFloat(i.stopLoss) > 0)
  const stopCoverage = (withStop.length / open.length) * 100
  let dollarAtRisk = 0
  withStop.forEach(i => {
    const price = parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0
    const stop = parseFloat(i.stopLoss)
    const shares = parseFloat(i.shares) || 0
    if (stop < price) dollarAtRisk += (price - stop) * shares
  })

  // Portfolio beta (weighted avg of individual betas estimated from correlation with SPY)
  const SPY_VOL = 0.17
  let weightedBeta = 0
  open.forEach((inv, idx) => {
    const p = getAssetParams(inv.symbol)
    const corrWithSPY = getCorrelation(inv.symbol, 'SPY')
    const beta = (p.s * corrWithSPY) / SPY_VOL
    weightedBeta += weights[idx] * beta
  })

  // VaR 95% (1-day, assumes normal returns, annualized σ → daily σ = σ/√252)
  const symbols = open.map(i => i.symbol)
  const cur = portfolioStats(symbols, weights)
  const dailyVol = cur.vol / Math.sqrt(252)
  const var95 = totalMV * dailyVol * 1.645

  return {
    totalMV,
    hhi,
    diversificationScore,
    topPosition: topPosition.symbol,
    topWeight,
    stopCoverage,
    dollarAtRisk,
    positionsWithStop: withStop.length,
    totalPositions: open.length,
    weightedBeta,
    var95,
    expectedReturn: cur.ret * 100,
    portfolioVol: cur.vol * 100,
    sharpe: cur.sharpe,
  }
}

const SPY_VOL = 0.17

function positionBeta(symbol) {
  const p = getAssetParams(symbol)
  return (p.s * getCorrelation(symbol, 'SPY')) / SPY_VOL
}

export function getRiskContribution(investments) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  if (open.length < 2) return []

  const symbols = open.map(i => i.symbol)
  const mvs = open.map(i => (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0))
  const totalMV = mvs.reduce((a, b) => a + b, 0)
  const weights = mvs.map(v => v / totalMV)
  const params = symbols.map(s => getAssetParams(s))
  const n = symbols.length

  let portfolioVariance = 0
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      portfolioVariance += weights[i] * weights[j] * params[i].s * params[j].s * getCorrelation(symbols[i], symbols[j])
  const portfolioVol = Math.sqrt(Math.max(portfolioVariance, 1e-10))

  return symbols.map((sym, i) => {
    let cov = 0
    for (let j = 0; j < n; j++)
      cov += weights[j] * params[i].s * params[j].s * getCorrelation(symbols[i], symbols[j])
    const componentRisk = weights[i] * cov / portfolioVol
    const riskPct = (componentRisk / portfolioVol) * 100
    return {
      symbol: sym,
      weight: +(weights[i] * 100).toFixed(1),
      riskPct: +riskPct.toFixed(1),
      beta: +positionBeta(sym).toFixed(2),
      vol: +(params[i].s * 100).toFixed(0),
      mv: +mvs[i].toFixed(0),
    }
  }).sort((a, b) => b.riskPct - a.riskPct)
}

export function getCorrelationMatrix(investments) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  if (open.length === 0) return { symbols: [], matrix: [] }
  const symbols = open.map(i => i.symbol)
  const matrix = symbols.map(s1 => symbols.map(s2 => +getCorrelation(s1, s2).toFixed(2)))
  return { symbols, matrix }
}

export function getStressTests(investments) {
  const open = investments.filter(i => i.status === 'open' && parseFloat(i.shares) > 0)
  if (open.length === 0) return []

  const mvs = open.map(i => (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0))
  const totalMV = mvs.reduce((a, b) => a + b, 0)
  const weights = mvs.map(v => v / totalMV)

  let portfolioBeta = 0
  open.forEach((inv, i) => { portfolioBeta += weights[i] * positionBeta(inv.symbol) })

  const SCENARIOS = [
    { name: 'Bull Run',      icon: '🚀', marketMove: 0.20,  color: 'green' },
    { name: 'Mild Pullback', icon: '📉', marketMove: -0.05, color: 'yellow' },
    { name: 'Correction',    icon: '⚠️', marketMove: -0.10, color: 'yellow' },
    { name: 'Bear Market',   icon: '🐻', marketMove: -0.20, color: 'orange' },
    { name: 'Crash',         icon: '💥', marketMove: -0.30, color: 'red' },
    { name: '2008-Level',    icon: '☠️', marketMove: -0.50, color: 'red' },
  ]

  return SCENARIOS.map(s => {
    const portMove = portfolioBeta * s.marketMove
    const positions = open.map((inv, i) => {
      const beta = positionBeta(inv.symbol)
      const move = beta * s.marketMove
      return { symbol: inv.symbol, beta: +beta.toFixed(2), movePct: +(move * 100).toFixed(1), impact: +(move * mvs[i]).toFixed(0) }
    }).sort((a, b) => a.impact - b.impact)
    return { ...s, portMovePct: +(portMove * 100).toFixed(1), dollarImpact: +(portMove * totalMV).toFixed(0), positions }
  })
}
