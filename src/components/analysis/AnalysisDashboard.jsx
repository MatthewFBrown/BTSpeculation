import { useState, useEffect } from 'react'
import EfficientFrontier from './EfficientFrontier'
import RiskAnalysis from './RiskAnalysis'
import Fundamentals from './Fundamentals'
import Financials from './Financials'
import Research from './Research'
import DCF from './DCF'
import PortfolioOptimizer from './PortfolioOptimizer'
import { fetchCorrelations } from '../../utils/fetchCorrelations'
import { setRealCorrelations, setComputedParams } from '../../utils/efficientFrontier'

const TABS = [
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'financials',   label: 'Financials' },
  { id: 'research',     label: 'Research' },
  { id: 'dcf',          label: 'DCF' },
  { id: 'frontier',     label: 'Efficient Frontier' },
  { id: 'optimizer',    label: 'Optimizer' },
  { id: 'risk',         label: 'Risk' },
]

export default function AnalysisDashboard({ investments, cash = 0, watchlistNav, onWatchlistNavConsumed, efParamsKey = 'bt_ef_params', efResearchParamsKey = 'bt_ef_research_params' }) {
  const [tab, setTab] = useState('fundamentals')
  const [researchSymbol,   setResearchSymbol]   = useState(null)
  const [financialsSymbol, setFinancialsSymbol] = useState(null)
  const [corrVersion, setCorrVersion]           = useState(0)
  const [optimizerSymbols, setOptimizerSymbols] = useState(null)

  // Fetch real correlations for open portfolio positions
  useEffect(() => {
    const symbols = investments.filter(i => i.status === 'open').map(i => i.symbol)
    if (symbols.length < 2) return
    fetchCorrelations(symbols).then(({ corrMap, paramsMap }) => {
      if (Object.keys(corrMap).length > 0) {
        setRealCorrelations(corrMap)
        setComputedParams(paramsMap)
        setCorrVersion(v => v + 1)
      }
    })
  }, [investments.filter(i => i.status === 'open').map(i => i.symbol).join(',')])  // eslint-disable-line

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
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fundamentals' && <Fundamentals investments={investments} />}
      {tab === 'financials'   && <Financials         investments={investments} preloadSymbol={financialsSymbol} />}
      {tab === 'research'     && <Research           investments={investments} cash={cash} preloadSymbol={researchSymbol} efResearchParamsKey={efResearchParamsKey} onSendToOptimizer={syms => { setOptimizerSymbols(syms); setTab('optimizer') }} />}
      {tab === 'dcf'          && <DCF                 investments={investments} />}
      {tab === 'frontier'     && <EfficientFrontier   investments={investments} cash={cash} storageKey={efParamsKey} />}
      {tab === 'optimizer'    && <PortfolioOptimizer  investments={investments} corrVersion={corrVersion} incomingSymbols={optimizerSymbols} onClearIncoming={() => setOptimizerSymbols(null)} />}
      {tab === 'risk'         && <RiskAnalysis        investments={investments} cash={cash} corrVersion={corrVersion} />}
    </div>
  )
}
