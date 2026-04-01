import FrontierPanel from './FrontierPanel'

export default function EfficientFrontier({ investments, cash = 0, storageKey = 'bt_ef_params' }) {
  const open = investments.filter(i => i.status === 'open')
  if (open.length < 2) {
    return (
      <div className="text-center text-slate-500 py-16 text-sm">
        Need at least 2 open positions to generate the efficient frontier.
      </div>
    )
  }
  return <FrontierPanel investments={investments} cash={cash} storageKey={storageKey} />
}
