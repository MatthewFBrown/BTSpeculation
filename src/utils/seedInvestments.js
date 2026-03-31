// Efficient Frontier demo portfolio — ~$100k across 8 uncorrelated asset classes.
// Designed to illustrate MPT principles: high-Sharpe growth stocks (META, MSFT, NVDA)
// paired with genuine diversifiers (TLT bonds, GLD gold, XOM energy, JPM financials, BTC crypto).
// No overlapping ETF + individual stock positions; weights approximate the Max Sharpe allocation.

export const SEED_INVESTMENTS = [
  // ── Open positions ─────────────────────────────────────────────────────────

  // ~20% — Communication Services / high individual Sharpe
  {
    id: 'i001', symbol: 'META', name: 'Meta Platforms',
    assetType: 'Stock', sector: 'Communication Services',
    shares: '35', avgCost: '358.00', currentPrice: '562.00',
    buyDate: '2024-02-08', status: 'open',
    stopLoss: '500.00', targetPrice: '680.00',
    chartLink: '',
    notes: 'Best risk-adjusted return in mega-cap tech. Ad revenue recovery + AI monetisation. Stop below Feb breakout level.',
  },

  // ~20% — Technology / defensive quality tech
  {
    id: 'i002', symbol: 'MSFT', name: 'Microsoft Corporation',
    assetType: 'Stock', sector: 'Technology',
    shares: '48', avgCost: '374.00', currentPrice: '415.00',
    buyDate: '2024-03-05', status: 'open',
    stopLoss: '385.00', targetPrice: '490.00',
    chartLink: '',
    notes: 'Lower vol than peers, Azure AI growth, Copilot monetisation. Anchors the tech sleeve with best Sharpe in category.',
  },

  // ~15% — Technology / highest expected return in the model
  {
    id: 'i003', symbol: 'NVDA', name: 'NVIDIA Corporation',
    assetType: 'Stock', sector: 'Technology',
    shares: '17', avgCost: '495.00', currentPrice: '875.00',
    buyDate: '2024-02-20', status: 'open',
    stopLoss: '780.00', targetPrice: '1100.00',
    chartLink: '',
    notes: 'AI infrastructure supercycle. Highest expected return in model (38%). Sized at 15% to balance high vol (55%). Stop below prior breakout.',
  },

  // ~15% — ETF/Bond — NEGATIVE correlation with equities (-0.10 vs tech)
  {
    id: 'i004', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF',
    assetType: 'ETF', sector: 'ETF / Index',
    shares: '156', avgCost: '91.00', currentPrice: '96.00',
    buyDate: '2024-09-20', status: 'open',
    stopLoss: '88.00', targetPrice: '112.00',
    chartLink: '',
    notes: 'Core diversifier — negative correlation with equities dampens portfolio vol significantly. Rate-cut cycle tailwind. Sized to offset equity beta.',
  },

  // ~10% — Gold — near-zero correlation with tech (0.05), inflation hedge
  {
    id: 'i005', symbol: 'GLD', name: 'SPDR Gold Shares',
    assetType: 'ETF', sector: 'Metals',
    shares: '44', avgCost: '186.00', currentPrice: '228.00',
    buyDate: '2024-02-14', status: 'open',
    stopLoss: '212.00', targetPrice: '265.00',
    chartLink: '',
    notes: 'Near-zero correlation with equities (0.05). Provides genuine diversification not just sector rotation. Central bank buying thesis intact.',
  },

  // ~10% — Crypto — high return (50%), moderate correlation (0.25 with tech)
  {
    id: 'i006', symbol: 'BTC', name: 'Bitcoin',
    assetType: 'Crypto', sector: 'Crypto',
    shares: '0.11', avgCost: '42000', currentPrice: '97000',
    buyDate: '2024-01-15', status: 'open',
    stopLoss: '78000', targetPrice: '155000',
    chartLink: '',
    notes: 'Small allocation (10%) captures high expected return (50%) with relatively low correlation to equities (0.25). Halving cycle + ETF inflows. Sized to not dominate risk budget.',
  },

  // ~5% — Energy — low tech correlation (0.25), dividend yield, sector hedge
  {
    id: 'i007', symbol: 'XOM', name: 'Exxon Mobil Corporation',
    assetType: 'Stock', sector: 'Energy',
    shares: '44', avgCost: '102.00', currentPrice: '112.00',
    buyDate: '2024-04-10', status: 'open',
    stopLoss: '104.00', targetPrice: '132.00',
    chartLink: '',
    notes: 'Energy acts as hedge against tech drawdowns (low correlation). Dividend yield + supply constraints. 5% position keeps energy exposure risk-efficient.',
  },

  // ~5% — Financials — moderate correlation (0.55 with tech), rate-sensitive diversifier
  {
    id: 'i008', symbol: 'JPM', name: 'JPMorgan Chase & Co.',
    assetType: 'Stock', sector: 'Financials',
    shares: '22', avgCost: '185.00', currentPrice: '225.00',
    buyDate: '2024-04-18', status: 'open',
    stopLoss: '208.00', targetPrice: '265.00',
    chartLink: '',
    notes: 'Financials diversify away from pure tech concentration. Moderate correlation (0.55). Benefits from steepening yield curve. 5% keeps position risk-efficient.',
  },

  // ── Closed positions — showing the rebalancing journey toward this portfolio ──

  // Sold — tech overlap, MSFT + META already cover the space with better Sharpe
  {
    id: 'i009', symbol: 'AAPL', name: 'Apple Inc.',
    assetType: 'Stock', sector: 'Technology',
    shares: '25', avgCost: '161.50', currentPrice: '',
    buyDate: '2024-01-12', status: 'closed',
    sellPrice: '213.00', sellDate: '2024-06-15',
    stopLoss: '', targetPrice: '', chartLink: '',
    notes: 'Sold to reduce tech concentration. AAPL highly correlated with MSFT (0.65). Capital redeployed into TLT and GLD to improve diversification score and lower portfolio vol.',
  },

  // Sold — QQQ overlaps heavily with MSFT, META, NVDA individual positions
  {
    id: 'i010', symbol: 'QQQ', name: 'Invesco Nasdaq-100 ETF',
    assetType: 'ETF', sector: 'ETF / Index',
    shares: '20', avgCost: '415.00', currentPrice: '',
    buyDate: '2024-01-03', status: 'closed',
    sellPrice: '488.00', sellDate: '2024-07-10',
    stopLoss: '', targetPrice: '', chartLink: '',
    notes: 'Sold — 90%+ overlap with existing MSFT, META, NVDA positions. ETF correlation with individual tech holdings ~0.85 meant no diversification benefit. Replaced with XOM and JPM.',
  },

  // Sold at loss — poor Sharpe, high vol, thesis failed
  {
    id: 'i011', symbol: 'TSLA', name: 'Tesla Inc.',
    assetType: 'Stock', sector: 'Consumer Discretionary',
    shares: '10', avgCost: '220.00', currentPrice: '',
    buyDate: '2024-01-08', status: 'closed',
    sellPrice: '185.00', sellDate: '2024-04-22',
    stopLoss: '', targetPrice: '', chartLink: '',
    notes: 'Cut — high volatility (65%) with declining expected return. Worst Sharpe in portfolio. Stop hit after margin compression news. Reallocated to GLD for better risk-adjusted exposure.',
  },

  // Sold at small profit — consumer discretionary too correlated with tech sleeve
  {
    id: 'i012', symbol: 'AMZN', name: 'Amazon.com Inc.',
    assetType: 'Stock', sector: 'Consumer Discretionary',
    shares: '12', avgCost: '175.00', currentPrice: '',
    buyDate: '2024-03-18', status: 'closed',
    sellPrice: '192.00', sellDate: '2024-08-05',
    stopLoss: '', targetPrice: '', chartLink: '',
    notes: 'Trimmed — AMZN correlated with existing tech positions (0.65+). Rebalanced into TLT to improve portfolio Sharpe by reducing equity cluster risk.',
  },
]
