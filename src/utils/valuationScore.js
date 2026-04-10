/**
 * Calculate a valuation score (1-5) based on multiple metrics
 * Helps identify if a stock is relatively cheap or expensive
 */

export function calculateValuationScore(metrics, quote) {
  if (!metrics || !quote) {
    return { score: 0, breakdown: {}, reasoning: 'Insufficient data' }
  }

  const pe = metrics.peBasicExclExtraTTM
  const dividendYield = (metrics.dividendYield || 0) * 100 // Convert to percentage
  const payoutRatio = (metrics.payoutRatio || 0) * 100
  const eps = metrics.epsBasicTTM || 0
  const epsEstimate = metrics.epsEstimate || 0

  let peScore = 0
  let peReason = ''
  if (pe == null || isNaN(pe)) {
    peScore = 2.5
    peReason = 'P/E not available'
  } else if (pe < 15) {
    peScore = 5
    peReason = `P/E ${pe.toFixed(1)} (undervalued)`
  } else if (pe < 20) {
    peScore = 4
    peReason = `P/E ${pe.toFixed(1)} (fair)`
  } else if (pe < 30) {
    peScore = 3
    peReason = `P/E ${pe.toFixed(1)} (fairly valued)`
  } else {
    peScore = 1
    peReason = `P/E ${pe.toFixed(1)} (expensive)`
  }

  // Dividend score
  let dividendScore = 0
  let dividendReason = ''
  if (dividendYield > 3) {
    dividendScore = 5
    dividendReason = `Yield ${dividendYield.toFixed(2)}% (high)`
  } else if (dividendYield > 1) {
    dividendScore = 4
    dividendReason = `Yield ${dividendYield.toFixed(2)}% (good)`
  } else if (dividendYield > 0.5) {
    dividendScore = 3
    dividendReason = `Yield ${dividendYield.toFixed(2)}% (modest)`
  } else {
    dividendScore = 2
    dividendReason = `Yield ${dividendYield.toFixed(2)}% (low/no dividend)`
  }

  // PEG ratio (P/E divided by growth rate)
  // Estimate growth rate as (EPS estimate - current EPS) / current EPS
  let pegScore = 0
  let pegReason = ''
  if (eps > 0 && epsEstimate > 0) {
    const growthRate = ((epsEstimate - eps) / eps) * 100
    const peg = growthRate > 0 ? pe / growthRate : pe
    if (peg < 1) {
      pegScore = 5
      pegReason = `PEG ${peg.toFixed(2)} (undervalued growth)`
    } else if (peg < 1.5) {
      pegScore = 4
      pegReason = `PEG ${peg.toFixed(2)} (fair growth)`
    } else if (peg < 2) {
      pegScore = 3
      pegReason = `PEG ${peg.toFixed(2)} (reasonable)`
    } else {
      pegScore = 1
      pegReason = `PEG ${peg.toFixed(2)} (expensive growth)`
    }
  } else {
    pegScore = 2.5
    pegReason = 'PEG calculation unavailable'
  }

  // Payout ratio score
  let payoutScore = 0
  let payoutReason = ''
  if (payoutRatio > 100) {
    payoutScore = 1
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (unsustainable)`
  } else if (payoutRatio > 80) {
    payoutScore = 2
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (high risk)`
  } else if (payoutRatio > 60) {
    payoutScore = 3
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (caution)`
  } else if (payoutRatio > 20) {
    payoutScore = 5
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (sustainable)`
  } else if (payoutRatio > 5) {
    payoutScore = 4
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (reinvesting)`
  } else {
    payoutScore = 3
    payoutReason = `Payout ${payoutRatio.toFixed(0)}% (growth focused)`
  }

  // Calculate overall score
  const scores = [peScore, dividendScore, pegScore, payoutScore]
  const validScores = scores.filter(s => s > 0)
  const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 2.5

  return {
    score: Math.round(avgScore * 2) / 2, // Round to nearest 0.5
    breakdown: {
      pe: { score: peScore, reason: peReason },
      dividend: { score: dividendScore, reason: dividendReason },
      peg: { score: pegScore, reason: pegReason },
      payout: { score: payoutScore, reason: payoutReason },
    },
    reasoning: `Based on P/E valuation, dividend yield, growth prospects (PEG), and payout sustainability.`,
  }
}

export function getEarningsHistory(earningsData) {
  // Real historical earnings from Finnhub /stock/earnings (free tier)
  // Shape: { symbol, earnings: [{ actual, estimate, period, quarter, surprise, surprisePercent, year }] }
  if (!earningsData?.earnings || !Array.isArray(earningsData.earnings)) return []

  return earningsData.earnings.slice(0, 8).reverse().map(e => ({
    quarter: `Q${e.quarter} ${e.year}`,
    actual: e.actual != null ? parseFloat(e.actual).toFixed(2) : '—',
    estimate: e.estimate != null ? parseFloat(e.estimate).toFixed(2) : '—',
    surprise: e.surprisePercent != null ? parseFloat(e.surprisePercent).toFixed(1) : null,
    period: e.period ?? '—',
  }))
}
