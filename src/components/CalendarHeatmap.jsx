import { fmt } from '../utils/calculations'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayColor(pnl) {
  if (pnl === undefined) return 'bg-slate-700/40 text-slate-600'
  if (pnl === 0) return 'bg-slate-600 text-slate-400'
  if (pnl > 0) {
    if (pnl > 2000) return 'bg-green-400 text-green-900'
    if (pnl > 1000) return 'bg-green-500 text-green-950'
    if (pnl > 500) return 'bg-green-600 text-white'
    if (pnl > 200) return 'bg-green-700 text-white'
    return 'bg-green-800/80 text-green-200'
  } else {
    if (pnl < -2000) return 'bg-red-400 text-red-900'
    if (pnl < -1000) return 'bg-red-500 text-red-950'
    if (pnl < -500) return 'bg-red-600 text-white'
    if (pnl < -200) return 'bg-red-700 text-white'
    return 'bg-red-800/80 text-red-200'
  }
}

function buildMonthGrid(year, month, pnlByDate) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // day of week for first day (0=Sun, adjust to Mon=0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon-based offset

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null) // empty prefix
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date: dateStr, pnl: pnlByDate[dateStr] })
  }
  // pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function CalendarHeatmap({ dailyData }) {
  if (dailyData.length === 0) {
    return <div className="text-center text-slate-500 py-12 text-sm">No closed trades with exit dates yet.</div>
  }

  // Build lookup: date string → pnl
  const pnlByDate = {}
  dailyData.forEach(({ date, pnl }) => { pnlByDate[date] = pnl })

  // Find date range
  const dates = dailyData.map(d => d.date).sort()
  const startDate = new Date(dates[0] + 'T12:00:00')
  const endDate = new Date(dates[dates.length - 1] + 'T12:00:00')

  // Build list of months to render
  const months = []
  let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  while (cur <= endDate) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div>
      <div className="flex flex-wrap gap-6">
      {months.map(({ year, month }) => {
        const cells = buildMonthGrid(year, month, pnlByDate)
        const weeks = []
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

        return (
          <div key={`${year}-${month}`} className="shrink-0">
            <p className="text-sm font-semibold text-slate-300 mb-2">{monthNames[month]} {year}</p>
            <div>
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    {DAYS.map(d => (
                      <th key={d} className="w-10 sm:w-12 h-6 text-center text-slate-500 font-medium pb-1">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((cell, di) => (
                        <td key={di} className="p-0.5">
                          {cell === null ? (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded" />
                          ) : (
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded flex flex-col items-center justify-center cursor-default group relative ${getDayColor(cell.pnl)}`}
                              title={cell.pnl !== undefined ? `${cell.date}: ${fmt(cell.pnl)}` : cell.date}
                            >
                              <span className="font-medium text-xs leading-none">{cell.day}</span>
                              {cell.pnl !== undefined && (
                                <span className="text-[9px] leading-none mt-0.5 opacity-80">
                                  {fmt(cell.pnl)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-slate-700 mt-4">
        <span className="text-[10px] sm:text-xs text-slate-500">P&L scale:</span>
        {[
          { label: '> $2k', cls: 'bg-green-400' },
          { label: '> $1k', cls: 'bg-green-500' },
          { label: '> $500', cls: 'bg-green-600' },
          { label: '> $200', cls: 'bg-green-700' },
          { label: '> $0', cls: 'bg-green-800/80' },
          { label: 'No trade', cls: 'bg-slate-700/40' },
          { label: '< $0', cls: 'bg-red-800/80' },
          { label: '< -$200', cls: 'bg-red-700' },
          { label: '< -$500', cls: 'bg-red-600' },
          { label: '< -$1k', cls: 'bg-red-500' },
          { label: '< -$2k', cls: 'bg-red-400' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded ${cls}`} />
            <span className="text-[10px] sm:text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
