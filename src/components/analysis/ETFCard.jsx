import { Info } from 'lucide-react'

export const KNOWN_ETFS = {
  // Broad market
  SPY:  { name: 'SPDR S&P 500 ETF',           provider: 'State Street', type: 'ETF' },
  IVV:  { name: 'iShares Core S&P 500 ETF',    provider: 'BlackRock',   type: 'ETF' },
  VOO:  { name: 'Vanguard S&P 500 ETF',        provider: 'Vanguard',    type: 'ETF' },
  VTI:  { name: 'Vanguard Total Stock Market',  provider: 'Vanguard',   type: 'ETF' },
  ITOT: { name: 'iShares Core S&P Total US',   provider: 'BlackRock',   type: 'ETF' },
  SCHB: { name: 'Schwab US Broad Market ETF',  provider: 'Schwab',      type: 'ETF' },
  // International
  VEA:  { name: 'Vanguard Developed Mkts ETF', provider: 'Vanguard',    type: 'ETF' },
  VWO:  { name: 'Vanguard Emerging Mkts ETF',  provider: 'Vanguard',    type: 'ETF' },
  EFA:  { name: 'iShares MSCI EAFE ETF',       provider: 'BlackRock',   type: 'ETF' },
  EEM:  { name: 'iShares MSCI Emerging Mkts',  provider: 'BlackRock',   type: 'ETF' },
  VXUS: { name: 'Vanguard Total Intl Stock',   provider: 'Vanguard',    type: 'ETF' },
  // Sector & size
  QQQ:  { name: 'Invesco QQQ (Nasdaq-100)',    provider: 'Invesco',     type: 'ETF' },
  QQQM: { name: 'Invesco Nasdaq-100 ETF',      provider: 'Invesco',     type: 'ETF' },
  DIA:  { name: 'SPDR Dow Jones Indus. Avg',   provider: 'State Street',type: 'ETF' },
  IWM:  { name: 'iShares Russell 2000 ETF',    provider: 'BlackRock',   type: 'ETF' },
  VGT:  { name: 'Vanguard Info Technology',    provider: 'Vanguard',    type: 'ETF' },
  XLK:  { name: 'Tech Select Sector SPDR',     provider: 'State Street',type: 'ETF' },
  XLF:  { name: 'Financial Select Sector',     provider: 'State Street',type: 'ETF' },
  XLE:  { name: 'Energy Select Sector',        provider: 'State Street',type: 'ETF' },
  XLV:  { name: 'Health Care Select Sector',   provider: 'State Street',type: 'ETF' },
  XLU:  { name: 'Utilities Select Sector',     provider: 'State Street',type: 'ETF' },
  XLI:  { name: 'Industrial Select Sector',    provider: 'State Street',type: 'ETF' },
  XLB:  { name: 'Materials Select Sector',     provider: 'State Street',type: 'ETF' },
  XLRE: { name: 'Real Estate Select Sector',   provider: 'State Street',type: 'ETF' },
  XLP:  { name: 'Consumer Staples Sector',     provider: 'State Street',type: 'ETF' },
  XLY:  { name: 'Consumer Discr. Sector',      provider: 'State Street',type: 'ETF' },
  // Fixed income
  BND:  { name: 'Vanguard Total Bond Market',  provider: 'Vanguard',    type: 'ETF' },
  AGG:  { name: 'iShares Core US Aggregate',   provider: 'BlackRock',   type: 'ETF' },
  TLT:  { name: 'iShares 20+ Yr Treasury',     provider: 'BlackRock',   type: 'ETF' },
  IEF:  { name: 'iShares 7-10 Yr Treasury',    provider: 'BlackRock',   type: 'ETF' },
  SHY:  { name: 'iShares 1-3 Yr Treasury',     provider: 'BlackRock',   type: 'ETF' },
  LQD:  { name: 'iShares Investment Grade',    provider: 'BlackRock',   type: 'ETF' },
  HYG:  { name: 'iShares High Yield Corp',     provider: 'BlackRock',   type: 'ETF' },
  JNK:  { name: 'SPDR Bloomberg High Yield',   provider: 'State Street',type: 'ETF' },
  // Commodities / alternatives
  GLD:  { name: 'SPDR Gold Shares',            provider: 'State Street',type: 'ETF' },
  IAU:  { name: 'iShares Gold Trust',          provider: 'BlackRock',   type: 'ETF' },
  SLV:  { name: 'iShares Silver Trust',        provider: 'BlackRock',   type: 'ETF' },
  USO:  { name: 'United States Oil Fund',      provider: 'USCF',        type: 'ETF' },
  // Leveraged / inverse
  TQQQ: { name: 'ProShares UltraPro QQQ 3×',   provider: 'ProShares',  type: 'Leveraged ETF' },
  SQQQ: { name: 'ProShares UltraPro Short QQQ', provider: 'ProShares', type: 'Inverse ETF' },
  UPRO: { name: 'ProShares UltraPro S&P500 3×', provider: 'ProShares', type: 'Leveraged ETF' },
  SPXU: { name: 'ProShares UltraPro Short S&P', provider: 'ProShares', type: 'Inverse ETF' },
  // Crypto ETFs
  IBIT: { name: 'iShares Bitcoin Trust',       provider: 'BlackRock',   type: 'Crypto ETF' },
  FBTC: { name: 'Fidelity Wise Origin Bitcoin', provider: 'Fidelity',  type: 'Crypto ETF' },
  GBTC: { name: 'Grayscale Bitcoin Trust',     provider: 'Grayscale',   type: 'Crypto ETF' },
  ETHA: { name: 'iShares Ethereum Trust',      provider: 'BlackRock',   type: 'Crypto ETF' },
  // Indexes
  '^GSPC': { name: 'S&P 500 Index',            provider: 'S&P Dow Jones',type: 'Index' },
  '^DJI':  { name: 'Dow Jones Industrial Avg', provider: 'S&P Dow Jones',type: 'Index' },
  '^IXIC': { name: 'Nasdaq Composite',         provider: 'Nasdaq',       type: 'Index' },
  '^RUT':  { name: 'Russell 2000 Index',       provider: 'FTSE Russell', type: 'Index' },
  '^VIX':  { name: 'CBOE Volatility Index',    provider: 'CBOE',         type: 'Index' },
}

export function ETFCard({ sym }) {
  const info = KNOWN_ETFS[sym]
  const isIndex = info?.type === 'Index'
  return (
    <div className="bg-slate-800 rounded-xl border border-blue-500/30 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="bg-blue-500/10 rounded-lg p-2.5 shrink-0">
          <Info size={20} className="text-blue-400" />
        </div>
        <div>
          <p className="text-slate-200 font-semibold">
            {info ? info.name : sym} &nbsp;
            <span className="text-xs font-normal bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
              {info?.type ?? 'ETF / Index'}
            </span>
          </p>
          {info?.provider && (
            <p className="text-xs text-slate-500 mt-0.5">Provider: {info.provider}</p>
          )}
          <p className="text-sm text-slate-400 mt-1.5">
            {isIndex
              ? 'Market indexes do not have financial statements. Use the links below to explore index data.'
              : 'ETFs hold baskets of securities and do not publish income statements, balance sheets, or cash flow statements. Use the links below to research this fund.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {[
          { label: 'ETF.com',      href: `https://www.etf.com/${sym}`,                                     desc: 'Holdings, flows, overview' },
          { label: 'Yahoo Finance',href: `https://finance.yahoo.com/quote/${sym}`,                         desc: 'Price, news, chart' },
          { label: 'Morningstar',  href: `https://www.morningstar.com/etfs/arcx/${sym.replace('^','')}/quote`, desc: 'Analyst ratings, data' },
        ].map(({ label, href, desc }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            className="flex flex-col gap-0.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-lg px-3 py-2.5 transition-colors group">
            <span className="text-sm font-medium text-slate-200 group-hover:text-white">{label} ↗</span>
            <span className="text-xs text-slate-500">{desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
