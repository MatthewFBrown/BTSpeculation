// Futures multipliers — dollar value per 1 full point of price movement
export const FUTURES_MULTIPLIERS = {
  // Equity Index — Full Size
  '/ES':   50,       // E-mini S&P 500
  '/NQ':   20,       // E-mini Nasdaq-100
  '/YM':   5,        // E-mini Dow Jones
  '/RTY':  50,       // E-mini Russell 2000

  // Equity Index — Micro
  '/MES':  5,        // Micro E-mini S&P 500
  '/MNQ':  2,        // Micro E-mini Nasdaq-100
  '/MYM':  0.5,      // Micro E-mini Dow Jones
  '/M2K':  10,       // Micro E-mini Russell 2000

  // Energy — Full Size
  '/CL':   1000,     // Crude Oil (1,000 bbl)
  '/NG':   10000,    // Natural Gas (10,000 MMBtu)
  '/RB':   42000,    // RBOB Gasoline (42,000 gal)
  '/HO':   42000,    // Heating Oil (42,000 gal)

  // Energy — Micro
  '/MCL':  100,      // Micro Crude Oil (100 bbl)

  // Metals — Full Size
  '/GC':   100,      // Gold (100 troy oz)
  '/SI':   5000,     // Silver (5,000 troy oz)
  '/HG':   25000,    // Copper (25,000 lbs)
  '/PA':   100,      // Palladium (100 troy oz)
  '/PL':   50,       // Platinum (50 troy oz)

  // Metals — Micro
  '/MGC':  10,       // Micro Gold (10 troy oz)
  '/MHG':  2500,     // Micro Copper (2,500 lbs)

  // Bonds
  '/ZB':   1000,     // 30-Year T-Bond
  '/ZN':   1000,     // 10-Year T-Note
  '/ZF':   1000,     // 5-Year T-Note
  '/ZT':   2000,     // 2-Year T-Note

  // Forex — Full Size
  '/6E':   125000,   // Euro (125,000 EUR)
  '/6A':   100000,   // Australian Dollar (100,000 AUD)
  '/6B':   62500,    // British Pound (62,500 GBP)
  '/6C':   100000,   // Canadian Dollar (100,000 CAD)
  '/6S':   125000,   // Swiss Franc (125,000 CHF)
  '/6J':   12500000, // Japanese Yen (12,500,000 JPY)

  // Forex — Micro
  '/M6E':  12500,    // Micro Euro (12,500 EUR)
  '/M6A':  10000,    // Micro Australian Dollar (10,000 AUD)
  '/M6B':  6250,     // Micro British Pound (6,250 GBP)

  // Grains (price in cents/bushel — 5,000 bu contracts)
  '/ZC':   50,       // Corn
  '/ZS':   50,       // Soybeans
  '/ZW':   50,       // Wheat

  'OTHER': 1,
}

export function calcPnL(trade) {
  if (trade.status === 'open') return null

  const entry = parseFloat(trade.entryPrice)
  const exit = parseFloat(trade.exitPrice)
  const qty = parseFloat(trade.quantity)
  const fees = parseFloat(trade.fees) || 0

  if (isNaN(entry) || isNaN(exit) || isNaN(qty)) return null

  let gross = 0

  if (trade.type === 'option') {
    const direction = trade.direction === 'long' ? 1 : -1
    gross = direction * (exit - entry) * qty * 100
  } else if (trade.type === 'futures') {
    const multiplier = FUTURES_MULTIPLIERS[trade.symbol] ?? FUTURES_MULTIPLIERS['OTHER']
    const direction = trade.direction === 'long' ? 1 : -1
    gross = direction * (exit - entry) * qty * multiplier
  }

  return gross - fees
}

export function calcGross(trade) {
  if (trade.status === 'open') return null
  const entry = parseFloat(trade.entryPrice)
  const exit = parseFloat(trade.exitPrice)
  const qty = parseFloat(trade.quantity)
  if (isNaN(entry) || isNaN(exit) || isNaN(qty)) return null
  let gross = 0
  if (trade.type === 'option') {
    gross = (trade.direction === 'long' ? 1 : -1) * (exit - entry) * qty * 100
  } else if (trade.type === 'futures') {
    const multiplier = FUTURES_MULTIPLIERS[trade.symbol] ?? FUTURES_MULTIPLIERS['OTHER']
    gross = (trade.direction === 'long' ? 1 : -1) * (exit - entry) * qty * multiplier
  }
  return gross
}

export function holdingDays(trade) {
  if (!trade.entryDate || !trade.exitDate) return null
  const ms = new Date(trade.exitDate) - new Date(trade.entryDate)
  return Math.max(0, Math.round(ms / 86400000))
}

export function getStats(trades) {
  const closed = trades.filter(t => t.status === 'closed')
  const pnls = closed.map(calcPnL).filter(v => v !== null)
  const grossPnls = closed.map(calcGross).filter(v => v !== null)

  const totalPnL = pnls.reduce((a, b) => a + b, 0)
  const totalGross = grossPnls.reduce((a, b) => a + b, 0)
  const totalFees = closed.reduce((a, t) => a + (parseFloat(t.fees) || 0), 0)

  const wins = pnls.filter(v => v > 0)
  const losses = pnls.filter(v => v < 0)
  const winRate = pnls.length > 0 ? (wins.length / pnls.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0
  const bestTrade = wins.length > 0 ? Math.max(...wins) : null
  const worstTrade = losses.length > 0 ? Math.min(...losses) : null

  const grossWins = grossPnls.filter(v => v > 0)
  const grossLosses = grossPnls.filter(v => v < 0)
  const avgGrossWin = grossWins.length > 0 ? grossWins.reduce((a, b) => a + b, 0) / grossWins.length : 0
  const avgGrossLoss = grossLosses.length > 0 ? Math.abs(grossLosses.reduce((a, b) => a + b, 0) / grossLosses.length) : 0
  const rrRatio = avgGrossLoss > 0 ? avgGrossWin / avgGrossLoss : 0

  const profitFactor = losses.length > 0 && Math.abs(avgLoss * losses.length) > 0
    ? (avgWin * wins.length) / Math.abs(avgLoss * losses.length)
    : 0

  // Break-even win rate = |avgLoss| / (avgWin + |avgLoss|)
  const absAvgLoss = Math.abs(avgLoss)
  const requiredWinRate = avgWin > 0 && absAvgLoss > 0
    ? (absAvgLoss / (avgWin + absAvgLoss)) * 100
    : null

  // Expectancy = (winRate * avgWin) + (lossRate * avgLoss)
  const lossRate = pnls.length > 0 ? losses.length / pnls.length : 0
  const expectancy = (winRate / 100) * avgWin + lossRate * avgLoss

  // Max drawdown
  let peak = 0, running = 0, maxDD = 0
  const sortedClosed = [...closed].sort((a, b) => new Date(a.exitDate || a.entryDate) - new Date(b.exitDate || b.entryDate))
  sortedClosed.forEach(t => {
    const pnl = calcPnL(t) ?? 0
    running += pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })

  // Streaks
  const sortedPnls = sortedClosed.map(calcPnL).filter(v => v !== null)
  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0, streakType = null
  sortedPnls.forEach(p => {
    const type = p > 0 ? 'win' : 'loss'
    if (type === streakType) {
      tempStreak++
    } else {
      streakType = type
      tempStreak = 1
    }
    if (type === 'win' && tempStreak > maxWinStreak) maxWinStreak = tempStreak
    if (type === 'loss' && tempStreak > maxLossStreak) maxLossStreak = tempStreak
  })
  if (sortedPnls.length > 0) {
    const lastType = sortedPnls[sortedPnls.length - 1] > 0 ? 'win' : 'loss'
    let streak = 0
    for (let i = sortedPnls.length - 1; i >= 0; i--) {
      const t = sortedPnls[i] > 0 ? 'win' : 'loss'
      if (t === lastType) streak++
      else break
    }
    currentStreak = lastType === 'win' ? streak : -streak
  }

  // Avg holding days
  const holdingDaysArr = closed.map(holdingDays).filter(v => v !== null)
  const avgHoldingDays = holdingDaysArr.length > 0 ? holdingDaysArr.reduce((a, b) => a + b, 0) / holdingDaysArr.length : 0

  return {
    totalPnL, totalGross, totalFees,
    winRate, avgWin, avgLoss, bestTrade, worstTrade,
    rrRatio, profitFactor, expectancy, requiredWinRate,
    totalTrades: closed.length, wins: wins.length, losses: losses.length,
    maxDrawdown: maxDD,
    maxWinStreak, maxLossStreak, currentStreak,
    avgHoldingDays,
    openTrades: trades.filter(t => t.status === 'open').length,
  }
}

export function getEquityCurve(trades) {
  const closed = trades
    .filter(t => t.status === 'closed' && t.exitDate)
    .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate))

  let running = 0, peak = 0
  return closed.map(t => {
    const pnl = calcPnL(t)
    running += pnl ?? 0
    if (running > peak) peak = running
    const drawdown = -(peak - running)
    return { date: t.exitDate, pnl: pnl ?? 0, equity: running, drawdown }
  })
}

export function getDailyPnL(trades) {
  const closed = trades.filter(t => t.status === 'closed' && t.exitDate)
  const byDay = {}
  closed.forEach(t => {
    const day = t.exitDate
    const pnl = calcPnL(t) ?? 0
    byDay[day] = (byDay[day] ?? 0) + pnl
  })
  return Object.entries(byDay)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, pnl]) => ({ date, pnl }))
}

export function getPnLBySymbol(trades) {
  const closed = trades.filter(t => t.status === 'closed')
  const map = {}
  closed.forEach(t => {
    const key = t.symbol
    if (!map[key]) map[key] = { symbol: key, pnl: 0, trades: 0, wins: 0 }
    const pnl = calcPnL(t) ?? 0
    map[key].pnl += pnl
    map[key].trades++
    if (pnl > 0) map[key].wins++
  })
  return Object.values(map)
    .map(r => ({ ...r, winRate: r.trades > 0 ? (r.wins / r.trades) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl)
}

export function getPnLByDayOfWeek(trades) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const map = { Mon: { pnl: 0, trades: 0, wins: 0 }, Tue: { pnl: 0, trades: 0, wins: 0 }, Wed: { pnl: 0, trades: 0, wins: 0 }, Thu: { pnl: 0, trades: 0, wins: 0 }, Fri: { pnl: 0, trades: 0, wins: 0 } }
  trades.filter(t => t.status === 'closed' && t.exitDate).forEach(t => {
    const d = days[new Date(t.exitDate + 'T12:00:00').getDay()]
    if (!map[d]) return
    const pnl = calcPnL(t) ?? 0
    map[d].pnl += pnl
    map[d].trades++
    if (pnl > 0) map[d].wins++
  })
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => ({ day: d, ...map[d], winRate: map[d].trades > 0 ? (map[d].wins / map[d].trades) * 100 : 0 }))
}

export function getPnLByType(trades) {
  const closed = trades.filter(t => t.status === 'closed')
  const result = {}
  closed.forEach(t => {
    const key = t.type
    if (!result[key]) result[key] = { type: key, pnl: 0, trades: 0, wins: 0 }
    const pnl = calcPnL(t) ?? 0
    result[key].pnl += pnl
    result[key].trades++
    if (pnl > 0) result[key].wins++
  })
  return Object.values(result).map(r => ({ ...r, winRate: r.trades > 0 ? (r.wins / r.trades) * 100 : 0 }))
}

export function getPnLByDirection(trades) {
  const closed = trades.filter(t => t.status === 'closed')
  const result = {}
  closed.forEach(t => {
    const key = t.direction
    if (!result[key]) result[key] = { direction: key, pnl: 0, trades: 0, wins: 0 }
    const pnl = calcPnL(t) ?? 0
    result[key].pnl += pnl
    result[key].trades++
    if (pnl > 0) result[key].wins++
  })
  return Object.values(result).map(r => ({ ...r, winRate: r.trades > 0 ? (r.wins / r.trades) * 100 : 0 }))
}

export function getMonthlyPnL(trades) {
  const closed = trades.filter(t => t.status === 'closed' && t.exitDate)
  const map = {}
  closed.forEach(t => {
    const month = t.exitDate.slice(0, 7) // YYYY-MM
    const pnl = calcPnL(t) ?? 0
    if (!map[month]) map[month] = { month, pnl: 0, trades: 0, wins: 0 }
    map[month].pnl += pnl
    map[month].trades++
    if (pnl > 0) map[month].wins++
  })
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

export function getTradePnLDistribution(trades) {
  const closed = trades.filter(t => t.status === 'closed')
  const pnls = closed.map(calcPnL).filter(v => v !== null)
  if (pnls.length === 0) return []

  const min = Math.min(...pnls)
  const max = Math.max(...pnls)
  const bucketCount = Math.min(12, Math.max(5, pnls.length))
  const rawSize = (max - min) / bucketCount || 100

  // Round bucket size to a clean number
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawSize)))
  const bucketSize = Math.ceil(rawSize / magnitude) * magnitude

  // Start from a clean boundary below min
  const start = Math.floor(min / bucketSize) * bucketSize
  const end = Math.ceil(max / bucketSize) * bucketSize
  const actualBuckets = Math.ceil((end - start) / bucketSize)

  const buckets = Array.from({ length: actualBuckets }, (_, i) => {
    const from = start + i * bucketSize
    const to = start + (i + 1) * bucketSize
    return {
      range: `${fmt(from)} to ${fmt(to)}`,
      from,
      to,
      count: 0,
    }
  })

  pnls.forEach(p => {
    const idx = Math.min(Math.floor((p - start) / bucketSize), actualBuckets - 1)
    if (idx >= 0) buckets[idx].count++
  })

  return buckets
}

export function fmt(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function fmtFull(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
