import { useState, useEffect } from 'react'
import SectorAnalysis from './SectorAnalysis'
import PortfolioAnalysis from './PortfolioAnalysis'
import EfficientFrontier from './EfficientFrontier'
import RiskAnalysis from './RiskAnalysis'
import Fundamentals from './Fundamentals'
import Financials from './Financials'
import Research from './Research'

const TABS = [
  { id: 'portfolio',    label: 'Portfolio' },
  { id: 'sector',       label: 'Sector' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'financials',   label: 'Financials' },
  { id: 'research',     label: 'Research' },
  { id: 'frontier',     label: 'Efficient Frontier' },
  { id: 'risk',         label: 'Risk' },
]

export default function AnalysisDashboard({ investments, cash = 0, watchlistNav, onWatchlistNavConsumed }) {
  const [tab, setTab] = useState('portfolio')
  const [researchSymbol,   setResearchSymbol]   = useState(null)
  const [financialsSymbol, setFinancialsSymbol] = useState(null)

  // When a ticker tape click arrives, switch tab and preload symbol
  useEffect(() => {
    if (!watchlistNav) return
    const { dest, sym } = watchlistNav
    if (dest === 'research')   { setResearchSymbol(sym);   setTab('research') }
    if (dest === 'financials') { setFinancialsSymbol(sym); setTab('financials') }
    onWatchlistNavConsumed?.()
  }, [watchlistNav])  // eslint-disable-line

  return (
    <div>
      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'portfolio'    && <PortfolioAnalysis investments={investments} cash={cash} />}
      {tab === 'sector'       && <SectorAnalysis    investments={investments} />}
      {tab === 'fundamentals' && <Fundamentals       investments={investments} />}
      {tab === 'financials'   && <Financials         investments={investments} preloadSymbol={financialsSymbol} />}
      {tab === 'research'     && <Research           preloadSymbol={researchSymbol} />}
      {tab === 'frontier'     && <EfficientFrontier  investments={investments} />}
      {tab === 'risk'         && <RiskAnalysis       investments={investments} cash={cash} />}
    </div>
  )
}
