import { useEffect, useRef } from 'react'

export default function TradingViewChart({ symbol, height = 500, interval = 'D', style = '1' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !symbol) return

    // Build the exact DOM structure TradingView expects
    containerRef.current.innerHTML = `
      <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
      <div class="tradingview-widget-copyright" style="height:32px;display:flex;align-items:center;padding:0 8px">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:#60a5fa;font-size:11px">Track all markets on TradingView</a>
      </div>
    `

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style,
      locale: 'en',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    })
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [symbol, interval, style])

  if (!symbol) {
    return (
      <div
        className="flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700 text-slate-500 text-sm"
        style={{ height }}
      >
        Select a symbol to view chart
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
      style={{ height, width: '100%' }}
    />
  )
}
