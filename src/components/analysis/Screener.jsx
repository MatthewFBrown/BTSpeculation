import { useState, useRef, useEffect } from 'react'
import { ExternalLink, Copy, Check, RotateCcw, ChevronDown, Info, Bookmark, X } from 'lucide-react'
import { supabase } from '../../utils/supabase'

// ── Quick-access filters (shown prominently at top) ──────────
const QUICK_FILTERS = [
  {
    key: 'price', label: 'Price',
    hint: "Current share price. Use to set a budget range or target penny stocks vs. blue chips.",
    options: [
      { label: 'Any', code: '' },
      { label: 'Under $1', code: 'sh_price_u1' },
      { label: 'Under $5', code: 'sh_price_u5' },
      { label: 'Under $10', code: 'sh_price_u10' },
      { label: 'Under $20', code: 'sh_price_u20' },
      { label: 'Under $50', code: 'sh_price_u50' },
      { label: 'Over $1', code: 'sh_price_o1' },
      { label: 'Over $5', code: 'sh_price_o5' },
      { label: 'Over $10', code: 'sh_price_o10' },
      { label: 'Over $20', code: 'sh_price_o20' },
      { label: 'Over $50', code: 'sh_price_o50' },
      { label: 'Over $100', code: 'sh_price_o100' },
    ],
  },
  {
    key: 'cap', label: 'Market Cap',
    hint: "Total market value of all shares outstanding. Nano/Micro = higher risk & reward; Large/Mega = more stable blue chips.",
    options: [
      { label: 'Any', code: '' },
      { label: 'Nano (<50M)', code: 'cap_nano' },
      { label: 'Micro (<300M)', code: 'cap_micro' },
      { label: 'Small (300M–2B)', code: 'cap_small' },
      { label: 'Mid (2B–10B)', code: 'cap_mid' },
      { label: 'Large (10B–200B)', code: 'cap_large' },
      { label: 'Mega (>200B)', code: 'cap_mega' },
      { label: 'Small & above', code: 'cap_smallover' },
      { label: 'Mid & above', code: 'cap_midover' },
      { label: 'Large & above', code: 'cap_largeover' },
    ],
  },
  {
    key: 'optionable', label: 'Optionable / Shortable',
    hint: "Optionable = stock has listed options available to trade. Shortable = broker can lend shares for short selling.",
    options: [
      { label: 'Any', code: '' },
      { label: 'Optionable', code: 'sh_opt_option' },
      { label: 'Shortable', code: 'sh_opt_short' },
      { label: 'Optionable + Shortable', code: 'sh_opt_option,sh_opt_short' },
    ],
  },
  {
    key: 'avgvol', label: 'Avg Volume',
    hint: "Average daily trading volume. Higher volume = more liquidity, tighter spreads, and easier to enter/exit positions.",
    options: [
      { label: 'Any', code: '' },
      { label: 'Over 100K', code: 'sh_avgvol_o100' },
      { label: 'Over 200K', code: 'sh_avgvol_o200' },
      { label: 'Over 500K', code: 'sh_avgvol_o500' },
      { label: 'Over 1M', code: 'sh_avgvol_o1000' },
      { label: 'Over 2M', code: 'sh_avgvol_o2000' },
      { label: 'Under 500K', code: 'sh_avgvol_u500' },
      { label: 'Under 1M', code: 'sh_avgvol_u1000' },
    ],
  },
]

// ── Filter definitions ────────────────────────────────────────
const FILTER_GROUPS = [
  {
    label: 'Dividend',
    filters: [
      {
        key: 'yield', label: 'Dividend Yield',
        hint: "Annual dividend paid as a % of share price. Higher yield = more income, but very high yields (>8%) may signal a cut is coming.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_div_pos' },
          { label: 'Over 1%', code: 'fa_div_o1' },
          { label: 'Over 2%', code: 'fa_div_o2' },
          { label: 'Over 3%', code: 'fa_div_o3' },
          { label: 'Over 4%', code: 'fa_div_o4' },
          { label: 'Over 5%', code: 'fa_div_o5' },
          { label: 'Over 6%', code: 'fa_div_o6' },
          { label: 'Over 8%', code: 'fa_div_o8' },
          { label: 'Over 10%', code: 'fa_div_o10' },
        ],
      },
      {
        key: 'payout', label: 'Payout Ratio',
        hint: "% of earnings paid out as dividends. Under 60% is generally sustainable. Over 80% can mean the dividend is at risk.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Low (<20%)', code: 'fa_payoutratio_low' },
          { label: 'Under 20%', code: 'fa_payoutratio_u20' },
          { label: 'Under 40%', code: 'fa_payoutratio_u40' },
          { label: 'Under 60%', code: 'fa_payoutratio_u60' },
          { label: 'Under 80%', code: 'fa_payoutratio_u80' },
          { label: 'Over 0%', code: 'fa_payoutratio_pos' },
        ],
      },
    ],
  },
  {
    label: 'Valuation',
    filters: [
      {
        key: 'pe', label: 'P/E Ratio',
        hint: "Price divided by trailing 12-month earnings per share. Lower = cheaper relative to current profits. Negative means unprofitable.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Profitable only', code: 'fa_pe_profitable' },
          { label: 'Under 5', code: 'fa_pe_u5' },
          { label: 'Under 10', code: 'fa_pe_u10' },
          { label: 'Under 15', code: 'fa_pe_u15' },
          { label: 'Under 20', code: 'fa_pe_u20' },
          { label: 'Under 25', code: 'fa_pe_u25' },
          { label: 'Under 30', code: 'fa_pe_u30' },
          { label: 'Under 40', code: 'fa_pe_u40' },
          { label: 'Under 50', code: 'fa_pe_u50' },
          { label: 'Over 5', code: 'fa_pe_o5' },
          { label: 'Over 10', code: 'fa_pe_o10' },
          { label: 'Over 15', code: 'fa_pe_o15' },
          { label: 'Over 20', code: 'fa_pe_o20' },
          { label: 'Over 30', code: 'fa_pe_o30' },
          { label: 'Over 40', code: 'fa_pe_o40' },
          { label: 'Over 50', code: 'fa_pe_o50' },
        ],
      },
      {
        key: 'fpe', label: 'Forward P/E',
        hint: "Price divided by next-12-month analyst earnings estimates. More useful than trailing P/E for fast-growing companies.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Profitable only', code: 'fa_fpe_profitable' },
          { label: 'Under 5', code: 'fa_fpe_u5' },
          { label: 'Under 10', code: 'fa_fpe_u10' },
          { label: 'Under 15', code: 'fa_fpe_u15' },
          { label: 'Under 20', code: 'fa_fpe_u20' },
          { label: 'Under 25', code: 'fa_fpe_u25' },
          { label: 'Under 30', code: 'fa_fpe_u30' },
          { label: 'Under 40', code: 'fa_fpe_u40' },
          { label: 'Under 50', code: 'fa_fpe_u50' },
          { label: 'Over 5', code: 'fa_fpe_o5' },
          { label: 'Over 10', code: 'fa_fpe_o10' },
          { label: 'Over 15', code: 'fa_fpe_o15' },
          { label: 'Over 20', code: 'fa_fpe_o20' },
          { label: 'Over 30', code: 'fa_fpe_o30' },
          { label: 'Over 50', code: 'fa_fpe_o50' },
          { label: 'High (>50)', code: 'fa_fpe_high' },
        ],
      },
      {
        key: 'ps', label: 'Price / Sales',
        hint: "Price per share divided by revenue per share. Useful for valuing unprofitable growth companies. Under 2 is generally cheap.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Under 1', code: 'fa_ps_u1' },
          { label: 'Under 2', code: 'fa_ps_u2' },
          { label: 'Under 3', code: 'fa_ps_u3' },
          { label: 'Under 5', code: 'fa_ps_u5' },
          { label: 'Under 10', code: 'fa_ps_u10' },
          { label: 'Over 1', code: 'fa_ps_o1' },
          { label: 'Over 2', code: 'fa_ps_o2' },
          { label: 'Over 5', code: 'fa_ps_o5' },
          { label: 'Over 10', code: 'fa_ps_o10' },
        ],
      },
      {
        key: 'pb', label: 'Price / Book',
        hint: "Price divided by book value (assets minus liabilities). Under 1 means trading below net asset value — can signal deep value or distress.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Under 1', code: 'fa_pb_u1' },
          { label: 'Under 2', code: 'fa_pb_u2' },
          { label: 'Under 3', code: 'fa_pb_u3' },
          { label: 'Under 5', code: 'fa_pb_u5' },
          { label: 'Under 10', code: 'fa_pb_u10' },
          { label: 'Over 1', code: 'fa_pb_o1' },
          { label: 'Over 2', code: 'fa_pb_o2' },
          { label: 'Over 5', code: 'fa_pb_o5' },
          { label: 'Over 10', code: 'fa_pb_o10' },
        ],
      },
      {
        key: 'peg', label: 'PEG Ratio',
        hint: "P/E divided by EPS growth rate. Under 1 is often considered undervalued — you're paying less for each unit of growth.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Under 1', code: 'fa_peg_low' },
          { label: 'Under 2', code: 'fa_peg_u2' },
          { label: 'Under 3', code: 'fa_peg_u3' },
          { label: 'Over 1', code: 'fa_peg_o1' },
          { label: 'Over 2', code: 'fa_peg_o2' },
          { label: 'Over 3', code: 'fa_peg_o3' },
        ],
      },
    ],
  },
  {
    label: 'Growth',
    filters: [
      {
        key: 'epsyoy', label: 'EPS Growth (YoY)',
        hint: "Year-over-year earnings per share growth comparing last fiscal year to the prior year.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Negative', code: 'fa_epsyoy_neg' },
          { label: 'Positive', code: 'fa_epsyoy_pos' },
          { label: 'Over 5%', code: 'fa_epsyoy_o5' },
          { label: 'Over 10%', code: 'fa_epsyoy_o10' },
          { label: 'Over 15%', code: 'fa_epsyoy_o15' },
          { label: 'Over 20%', code: 'fa_epsyoy_o20' },
          { label: 'Over 25%', code: 'fa_epsyoy_o25' },
          { label: 'Over 30%', code: 'fa_epsyoy_o30' },
        ],
      },
      {
        key: 'epsyoy1', label: 'EPS Growth (Next Y)',
        hint: "Analyst consensus estimate for EPS growth in the next fiscal year. Forward-looking momentum signal.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_epsyoy1_pos' },
          { label: 'Over 5%', code: 'fa_epsyoy1_o5' },
          { label: 'Over 10%', code: 'fa_epsyoy1_o10' },
          { label: 'Over 15%', code: 'fa_epsyoy1_o15' },
          { label: 'Over 20%', code: 'fa_epsyoy1_o20' },
          { label: 'Over 25%', code: 'fa_epsyoy1_o25' },
          { label: 'Over 30%', code: 'fa_epsyoy1_o30' },
        ],
      },
      {
        key: 'sales', label: 'Revenue Growth (QoQ)',
        hint: "Quarter-over-quarter revenue change. Strong positive growth signals business momentum.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_salesqoq_pos' },
          { label: 'Over 5%', code: 'fa_salesqoq_o5' },
          { label: 'Over 10%', code: 'fa_salesqoq_o10' },
          { label: 'Over 15%', code: 'fa_salesqoq_o15' },
          { label: 'Over 20%', code: 'fa_salesqoq_o20' },
          { label: 'Over 25%', code: 'fa_salesqoq_o25' },
          { label: 'Negative', code: 'fa_salesqoq_neg' },
        ],
      },
    ],
  },
  {
    label: 'Profitability',
    filters: [
      {
        key: 'roe', label: 'Return on Equity',
        hint: "Net income ÷ shareholder equity. Measures how efficiently the company generates profit from investor money. Over 15% is strong.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_roe_pos' },
          { label: 'Over 5%', code: 'fa_roe_o5' },
          { label: 'Over 10%', code: 'fa_roe_o10' },
          { label: 'Over 15%', code: 'fa_roe_o15' },
          { label: 'Over 20%', code: 'fa_roe_o20' },
          { label: 'Over 25%', code: 'fa_roe_o25' },
          { label: 'Over 30%', code: 'fa_roe_o30' },
          { label: 'Negative', code: 'fa_roe_neg' },
        ],
      },
      {
        key: 'roa', label: 'Return on Assets',
        hint: "Net income ÷ total assets. Shows how well assets are used to produce earnings. Over 5% is generally solid.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_roa_pos' },
          { label: 'Over 5%', code: 'fa_roa_o5' },
          { label: 'Over 10%', code: 'fa_roa_o10' },
          { label: 'Over 15%', code: 'fa_roa_o15' },
          { label: 'Over 20%', code: 'fa_roa_o20' },
          { label: 'Negative', code: 'fa_roa_neg' },
        ],
      },
      {
        key: 'grossmargin', label: 'Gross Margin',
        hint: "(Revenue − COGS) ÷ Revenue. High gross margin signals pricing power and a defensible business model. SaaS often >70%.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_grossmargin_pos' },
          { label: 'Over 10%', code: 'fa_grossmargin_o10' },
          { label: 'Over 20%', code: 'fa_grossmargin_o20' },
          { label: 'Over 30%', code: 'fa_grossmargin_o30' },
          { label: 'Over 40%', code: 'fa_grossmargin_o40' },
          { label: 'Over 50%', code: 'fa_grossmargin_o50' },
          { label: 'Over 60%', code: 'fa_grossmargin_o60' },
          { label: 'Over 70%', code: 'fa_grossmargin_o70' },
          { label: 'Negative', code: 'fa_grossmargin_neg' },
        ],
      },
      {
        key: 'opmargin', label: 'Operating Margin',
        hint: "Operating income ÷ revenue. Profit after operating expenses but before interest & taxes. Shows core business efficiency.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_operatingmargin_pos' },
          { label: 'Over 5%', code: 'fa_operatingmargin_o5' },
          { label: 'Over 10%', code: 'fa_operatingmargin_o10' },
          { label: 'Over 15%', code: 'fa_operatingmargin_o15' },
          { label: 'Over 20%', code: 'fa_operatingmargin_o20' },
          { label: 'Over 25%', code: 'fa_operatingmargin_o25' },
          { label: 'Over 30%', code: 'fa_operatingmargin_o30' },
          { label: 'Negative', code: 'fa_operatingmargin_neg' },
        ],
      },
      {
        key: 'netmargin', label: 'Net Margin',
        hint: "Net income ÷ revenue. The bottom-line profitability after all costs, interest, and taxes.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Positive', code: 'fa_netmargin_pos' },
          { label: 'Over 5%', code: 'fa_netmargin_o5' },
          { label: 'Over 10%', code: 'fa_netmargin_o10' },
          { label: 'Over 15%', code: 'fa_netmargin_o15' },
          { label: 'Over 20%', code: 'fa_netmargin_o20' },
          { label: 'Over 25%', code: 'fa_netmargin_o25' },
          { label: 'Over 30%', code: 'fa_netmargin_o30' },
          { label: 'Negative', code: 'fa_netmargin_neg' },
        ],
      },
    ],
  },
  {
    label: 'Financial Health',
    filters: [
      {
        key: 'de', label: 'Debt / Equity',
        hint: "Total debt divided by shareholder equity. Lower = less leveraged. Over 2 can be risky; some capital-heavy sectors (utilities, REITs) run higher.",
        options: [
          { label: 'Any', code: '' },
          { label: 'None (0)', code: 'fa_de_low' },
          { label: 'Under 0.1', code: 'fa_de_u0.1' },
          { label: 'Under 0.5', code: 'fa_de_u0.5' },
          { label: 'Under 1', code: 'fa_de_u1' },
          { label: 'Over 0.5', code: 'fa_de_o0.5' },
          { label: 'Over 1', code: 'fa_de_o1' },
          { label: 'Over 2', code: 'fa_de_o2' },
          { label: 'High (>0.5)', code: 'fa_de_high' },
        ],
      },
      {
        key: 'curratio', label: 'Current Ratio',
        hint: "Current assets ÷ current liabilities. Over 1 means the company can cover short-term debts. Under 1 may signal liquidity risk.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Over 1', code: 'fa_curratio_o1' },
          { label: 'Over 2', code: 'fa_curratio_o2' },
          { label: 'Over 3', code: 'fa_curratio_o3' },
          { label: 'Under 1', code: 'fa_curratio_u1' },
        ],
      },
    ],
  },
  {
    label: 'Company',
    filters: [
      {
        key: 'cap', label: 'Market Cap',
        hint: "Total market value of all shares outstanding. Nano/Micro = higher risk & reward; Large/Mega = more stable blue chips.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Nano (<50M)', code: 'cap_nano' },
          { label: 'Micro (<300M)', code: 'cap_micro' },
          { label: 'Small (300M–2B)', code: 'cap_small' },
          { label: 'Mid (2B–10B)', code: 'cap_mid' },
          { label: 'Large (10B–200B)', code: 'cap_large' },
          { label: 'Mega (>200B)', code: 'cap_mega' },
          { label: 'Small & above', code: 'cap_smallover' },
          { label: 'Mid & above', code: 'cap_midover' },
          { label: 'Large & above', code: 'cap_largeover' },
        ],
      },
      {
        key: 'sector', label: 'Sector',
        hint: "Limit results to a specific GICS sector. Useful for sector rotation or thematic screening.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Technology', code: 'sec_technology' },
          { label: 'Financial', code: 'sec_financial' },
          { label: 'Healthcare', code: 'sec_healthcare' },
          { label: 'Energy', code: 'sec_energy' },
          { label: 'Utilities', code: 'sec_utilities' },
          { label: 'Consumer Defensive', code: 'sec_consumerdefensive' },
          { label: 'Consumer Cyclical', code: 'sec_consumercyclical' },
          { label: 'Real Estate', code: 'sec_realestate' },
          { label: 'Industrials', code: 'sec_industrials' },
          { label: 'Basic Materials', code: 'sec_basicmaterials' },
          { label: 'Communication', code: 'sec_communicationservices' },
        ],
      },
      {
        key: 'country', label: 'Country',
        hint: "Country of incorporation or primary listing. USA-only is common for dividend screens requiring reliable payout history.",
        options: [
          { label: 'Any', code: '' },
          { label: 'USA', code: 'geo_usa' },
          { label: 'Canada', code: 'geo_canada' },
          { label: 'UK', code: 'geo_uk' },
          { label: 'Europe', code: 'geo_europe' },
          { label: 'Asia', code: 'geo_asia' },
        ],
      },
      {
        key: 'exchange', label: 'Exchange',
        hint: "Primary exchange the stock is listed on. NYSE typically has larger, more established companies; NASDAQ skews tech.",
        options: [
          { label: 'Any', code: '' },
          { label: 'NYSE', code: 'exch_nyse' },
          { label: 'NASDAQ', code: 'exch_nasd' },
          { label: 'AMEX', code: 'exch_amex' },
        ],
      },
      {
        key: 'index', label: 'Index',
        hint: "Filter to stocks included in a major index. S&P 500 = large US companies; NASDAQ 100 = top non-financial NASDAQ stocks.",
        options: [
          { label: 'Any', code: '' },
          { label: 'S&P 500', code: 'idx_sp500' },
          { label: 'NASDAQ 100', code: 'idx_ndx' },
          { label: 'Dow Jones', code: 'idx_dji' },
          { label: 'Russell 2000', code: 'idx_rut' },
        ],
      },
    ],
  },
  {
    label: 'Technical',
    filters: [
      {
        key: 'beta', label: 'Beta',
        hint: "Volatility relative to the S&P 500. Beta > 1 = moves more than the market; < 1 = more stable; negative = moves opposite.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Under 0', code: 'fa_beta_u0' },
          { label: 'Under 0.5', code: 'fa_beta_u0.5' },
          { label: 'Under 1', code: 'fa_beta_u1' },
          { label: 'Under 1.5', code: 'fa_beta_u1.5' },
          { label: 'Under 2', code: 'fa_beta_u2' },
          { label: 'Over 0', code: 'fa_beta_o0' },
          { label: 'Over 0.5', code: 'fa_beta_o0.5' },
          { label: 'Over 1', code: 'fa_beta_o1' },
          { label: 'Over 1.5', code: 'fa_beta_o1.5' },
          { label: 'Over 2', code: 'fa_beta_o2' },
        ],
      },
      {
        key: 'perf52w', label: '52-Week Return',
        hint: "Price return over the past 52 weeks. Use for momentum screens (up big) or contrarian value screens (down big).",
        options: [
          { label: 'Any', code: '' },
          { label: 'Down 50%+', code: 'ta_perf_52w_dn50' },
          { label: 'Down 30%+', code: 'ta_perf_52w_dn30' },
          { label: 'Down 20%+', code: 'ta_perf_52w_dn20' },
          { label: 'Down 10%+', code: 'ta_perf_52w_dn10' },
          { label: 'Up 10%+', code: 'ta_perf_52w_dup10' },
          { label: 'Up 20%+', code: 'ta_perf_52w_dup20' },
          { label: 'Up 30%+', code: 'ta_perf_52w_dup30' },
          { label: 'Up 50%+', code: 'ta_perf_52w_dup50' },
        ],
      },
      {
        key: 'avgvol', label: 'Avg Volume',
        hint: "Average daily trading volume. Higher volume = more liquidity, tighter spreads, and easier to enter/exit positions.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Over 100K', code: 'sh_avgvol_o100' },
          { label: 'Over 200K', code: 'sh_avgvol_o200' },
          { label: 'Over 500K', code: 'sh_avgvol_o500' },
          { label: 'Over 1M', code: 'sh_avgvol_o1000' },
          { label: 'Over 2M', code: 'sh_avgvol_o2000' },
          { label: 'Under 500K', code: 'sh_avgvol_u500' },
          { label: 'Under 1M', code: 'sh_avgvol_u1000' },
        ],
      },
      {
        key: 'short', label: 'Short Interest',
        hint: "Shares sold short as % of float. High short interest signals bearish sentiment — but can also fuel a short squeeze if the stock rises.",
        options: [
          { label: 'Any', code: '' },
          { label: 'Low (<5%)', code: 'sh_short_u5' },
          { label: 'Under 10%', code: 'sh_short_u10' },
          { label: 'Under 15%', code: 'sh_short_u15' },
          { label: 'Over 10%', code: 'sh_short_o10' },
          { label: 'Over 20%', code: 'sh_short_o20' },
          { label: 'Over 30%', code: 'sh_short_o30' },
        ],
      },
    ],
  },
]


// Build default state: quick filters + all group filters
const DEFAULTS = Object.fromEntries([
  ...QUICK_FILTERS.map(f => [f.key, '']),
  ...FILTER_GROUPS.flatMap(g => g.filters.map(f => [f.key, ''])),
])
const DEFAULT_SORT = '-price'

// ── Sub-components ────────────────────────────────────────────
const selectCls = "w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"

function FilterSelect({ filter, value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{filter.label}</label>
        {filter.hint && (
          <div className="relative group/tip flex-shrink-0">
            <Info size={10} className="text-slate-600 hover:text-slate-400 cursor-help transition-colors" />
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 ring-1 ring-white/[0.12] rounded-lg px-3 py-2.5 hidden group-hover/tip:block shadow-xl pointer-events-none">
              <p className="text-[11px] text-slate-300 leading-relaxed">{filter.hint}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <select value={value} onChange={e => onChange(filter.key, e.target.value)} className={selectCls}>
          {filter.options.map(o => (
            <option key={o.code} value={o.code}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Screener({ accountId = 'default', userId }) {
  const [filters, setFilters] = useState(DEFAULTS)
  const [copied, setCopied] = useState(false)
  const [saves, setSaves] = useState([])
  const [personalSaves, setPersonalSaves] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const saveInputRef = useRef(null)

  // Load saves: current account + personal (default) if different.
  // On first load, migrate any legacy localStorage saves to DB.
  useEffect(() => {
    async function load() {
      const { data: existing } = await supabase
        .from('screener_saves')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      let rows = existing || []

      // Migrate localStorage saves if DB is empty for this account
      if (rows.length === 0) {
        try {
          const legacy = JSON.parse(localStorage.getItem('bt_screener_saves') || '[]')
          if (legacy.length > 0) {
            const toInsert = legacy.map(s => ({ account_id: accountId, user_id: userId, name: s.name, filters: s.filters }))
            const { data: inserted } = await supabase.from('screener_saves').insert(toInsert).select()
            if (inserted?.length) {
              rows = inserted
              localStorage.removeItem('bt_screener_saves')
            }
          }
        } catch { /* ignore */ }
      }

      setSaves(rows)

      if (accountId !== 'default') {
        const { data: personal } = await supabase
          .from('screener_saves')
          .select('*')
          .eq('account_id', 'default')
          .order('created_at', { ascending: false })
        setPersonalSaves(personal || [])
      } else {
        setPersonalSaves([])
      }
    }
    load()
  }, [accountId])

  useEffect(() => {
    if (saving) saveInputRef.current?.focus()
  }, [saving])

  function set(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  function reset() {
    setFilters(DEFAULTS)
  }

  // Each filter value may itself be a comma-joined multi-code (e.g. optionable+shortable)
  const activeCodes = Object.values(filters).filter(Boolean).flatMap(v => v.split(','))
  const filterParam = activeCodes.join(',')
  const url = `https://finviz.com/screener.ashx?v=121${filterParam ? `&f=${filterParam}` : ''}&o=${DEFAULT_SORT}`

  const activeCount = Object.values(filters).filter(Boolean).length

  function openFinviz() {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function copyUrl() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function commitSave() {
    const name = saveName.trim()
    if (!name) return
    const { data, error } = await supabase
      .from('screener_saves')
      .insert({ account_id: accountId, user_id: userId, name, filters })
      .select()
      .single()
    if (!error && data) {
      setSaves(prev => [data, ...prev])
    }
    setSaving(false)
    setSaveName('')
  }

  function loadSave(entry) {
    setFilters({ ...DEFAULTS, ...entry.filters })
  }

  async function deleteSave(id) {
    await supabase.from('screener_saves').delete().eq('id', id)
    setSaves(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Stock Screener</h2>
          <p className="text-xs text-slate-500 mt-0.5">Build a Finviz screen — hover <span className="inline-flex items-center gap-0.5">the <Info size={10} className="inline text-slate-500 mx-0.5" /> icon</span> on any field for an explanation</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 ring-1 ring-white/[0.06] transition-colors"
        >
          <RotateCcw size={11} /> Reset{activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>

      {/* Saved screens */}
      {(saves.length > 0 || personalSaves.length > 0) && (
        <div className="bg-slate-800/40 ring-1 ring-white/[0.06] rounded-xl p-4 mb-5 space-y-3">
          {saves.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Saved Screens</p>
              <div className="flex flex-wrap gap-2">
                {saves.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 bg-slate-700/60 ring-1 ring-white/[0.07] rounded-lg pl-3 pr-1.5 py-1.5">
                    <button onClick={() => loadSave(s)} className="text-xs font-medium text-slate-200 hover:text-blue-300 transition-colors">{s.name}</button>
                    <button onClick={() => deleteSave(s.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-1"><X size={11} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {personalSaves.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Personal Screens</p>
              <div className="flex flex-wrap gap-2">
                {personalSaves.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 bg-violet-500/10 ring-1 ring-violet-500/20 rounded-lg pl-3 pr-2 py-1.5">
                    <button onClick={() => loadSave(s)} className="text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors">{s.name}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick filters */}
      <div className="bg-blue-500/[0.06] ring-1 ring-blue-500/20 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400/70 mb-3">Quick Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_FILTERS.map(f => (
            <FilterSelect key={f.key} filter={f} value={filters[f.key]} onChange={set} />
          ))}
        </div>
      </div>

      {/* Filter groups */}
      <div className="space-y-5">
        {FILTER_GROUPS.map(group => (
          <div key={group.label} className="bg-slate-800/40 ring-1 ring-white/[0.06] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">{group.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {group.filters.map(f => (
                <FilterSelect key={f.key} filter={f} value={filters[f.key]} onChange={set} />
              ))}
            </div>
          </div>
        ))}

      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          onClick={openFinviz}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_18px_rgba(59,130,246,0.3)]"
        >
          <ExternalLink size={14} /> Open in Finviz
        </button>
        <button
          onClick={copyUrl}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 ring-1 ring-white/[0.06] transition-colors"
        >
          {copied ? <><Check size={13} className="text-emerald-400" /> Copied</> : <><Copy size={13} /> Copy URL</>}
        </button>

        {/* Save screen */}
        {saving ? (
          <div className="flex items-center gap-2">
            <input
              ref={saveInputRef}
              type="text"
              placeholder="Screen name…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitSave(); if (e.key === 'Escape') { setSaving(false); setSaveName('') } }}
              className="bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none w-44"
            />
            <button
              onClick={commitSave}
              disabled={!saveName.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
            >
              <Check size={13} /> Save
            </button>
            <button onClick={() => { setSaving(false); setSaveName('') }} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSaving(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 ring-1 ring-white/[0.06] transition-colors"
          >
            <Bookmark size={13} /> Save Screen
          </button>
        )}
      </div>

      {/* URL preview */}
      <div className="mt-4 bg-slate-900/60 ring-1 ring-white/[0.06] rounded-lg px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">URL Preview</p>
        <p className="text-xs font-mono text-slate-400 break-all leading-relaxed">{url}</p>
      </div>
    </div>
  )
}
