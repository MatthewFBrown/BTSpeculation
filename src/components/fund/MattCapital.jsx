import { useState, useEffect, useMemo, useRef } from "react";
import {
    RefreshCw,
    HelpCircle,
    Calculator,
    Plus,
    Pencil,
    Trash2,
    X,
    FileText,
} from "lucide-react";
import { exportFundPDF } from "../../utils/exportFundPDF";
import { supabase } from "../../utils/supabase";
import Screener from "../analysis/Screener";
import FundWatchlist from "./FundWatchlist";
import DebateBoard from "./DebateBoard";
import WatchlistSummary from "./WatchlistSummary";

const DEMO_DATA = {
    startDate: "2026-04-08",
    cash: 12450,
    wheelPositions: [
        {
            ticker: "SOFI",
            type: "CSP",
            strike: 14.5,
            entry: "2026-04-08",
            expiry: "2026-04-17",
            premium: 0.13,
            contracts: 4,
        },
        {
            ticker: "CELH",
            type: "CSP",
            strike: 31,
            entry: "2026-04-08",
            expiry: "2026-04-17",
            premium: 0.2,
            contracts: 1,
        },
        {
            ticker: "AMD",
            type: "CSP",
            strike: 105,
            entry: "2026-04-07",
            expiry: "2026-04-25",
            premium: 1.85,
            contracts: 1,
        },
        {
            ticker: "PLTR",
            type: "CC",
            strike: 85,
            entry: "2026-04-01",
            expiry: "2026-04-17",
            premium: 1.1,
            contracts: 2,
        },
    ],
    stockPositions: [
        { ticker: "PLTR", shares: 200, entryPrice: 71.5 },
        { ticker: "SOFI", shares: 400, entryPrice: 14.2 },
    ],
    tradeLog: [
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2025-12-02",
            exit: "2025-12-06",
            pnl: 52,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "MARA",
            strategy: "CSP",
            entry: "2025-12-02",
            exit: "2025-12-19",
            pnl: 145,
            capital: 4000,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2025-12-09",
            exit: "2025-12-13",
            pnl: 98,
            capital: 11500,
            result: "win",
        },
        {
            ticker: "CELH",
            strategy: "CSP",
            entry: "2025-12-09",
            exit: "2025-12-19",
            pnl: -180,
            capital: 3200,
            result: "loss",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2025-12-15",
            exit: "2025-12-19",
            pnl: 44,
            capital: 5600,
            result: "win",
        },
        {
            ticker: "MARA",
            strategy: "CSP",
            entry: "2025-12-22",
            exit: "2025-12-26",
            pnl: 67,
            capital: 3800,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2026-01-06",
            exit: "2026-01-10",
            pnl: 112,
            capital: 11000,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CSP",
            entry: "2026-01-06",
            exit: "2026-01-17",
            pnl: 220,
            capital: 7000,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-01-06",
            exit: "2026-01-10",
            pnl: 48,
            capital: 5600,
            result: "win",
        },
        {
            ticker: "CELH",
            strategy: "CSP",
            entry: "2026-01-13",
            exit: "2026-01-17",
            pnl: 35,
            capital: 3000,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2026-01-20",
            exit: "2026-01-31",
            pnl: -240,
            capital: 10500,
            result: "loss",
        },
        {
            ticker: "AMD",
            strategy: "CC",
            entry: "2026-02-03",
            exit: "2026-02-07",
            pnl: 155,
            capital: 10500,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CSP",
            entry: "2026-01-27",
            exit: "2026-01-31",
            pnl: 195,
            capital: 7200,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-01-27",
            exit: "2026-01-31",
            pnl: 56,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "MARA",
            strategy: "CSP",
            entry: "2026-02-03",
            exit: "2026-02-07",
            pnl: -95,
            capital: 3600,
            result: "loss",
        },
        {
            ticker: "CELH",
            strategy: "CSP",
            entry: "2026-02-03",
            exit: "2026-02-20",
            pnl: 75,
            capital: 3100,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CC",
            entry: "2026-02-10",
            exit: "2026-02-14",
            pnl: 130,
            capital: 10500,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CSP",
            entry: "2026-02-10",
            exit: "2026-02-21",
            pnl: 210,
            capital: 7500,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-02-17",
            exit: "2026-02-21",
            pnl: 60,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CC",
            entry: "2026-02-17",
            exit: "2026-02-28",
            pnl: 185,
            capital: 10500,
            result: "win",
        },
        {
            ticker: "MARA",
            strategy: "CSP",
            entry: "2026-02-24",
            exit: "2026-02-28",
            pnl: 88,
            capital: 3400,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CSP",
            entry: "2026-03-03",
            exit: "2026-03-07",
            pnl: -310,
            capital: 7000,
            result: "loss",
        },
        {
            ticker: "PLTR",
            strategy: "CC",
            entry: "2026-03-10",
            exit: "2026-03-14",
            pnl: 175,
            capital: 7150,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-03-03",
            exit: "2026-03-07",
            pnl: 52,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2026-03-03",
            exit: "2026-03-21",
            pnl: 165,
            capital: 11000,
            result: "win",
        },
        {
            ticker: "CELH",
            strategy: "CSP",
            entry: "2026-03-10",
            exit: "2026-03-14",
            pnl: 40,
            capital: 3100,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-03-17",
            exit: "2026-03-21",
            pnl: 48,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CC",
            entry: "2026-03-17",
            exit: "2026-03-28",
            pnl: 230,
            capital: 7150,
            result: "win",
        },
        {
            ticker: "MARA",
            strategy: "CSP",
            entry: "2026-03-17",
            exit: "2026-03-21",
            pnl: -115,
            capital: 3200,
            result: "loss",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2026-03-24",
            exit: "2026-03-28",
            pnl: 145,
            capital: 10500,
            result: "win",
        },
        {
            ticker: "CELH",
            strategy: "CSP",
            entry: "2026-03-24",
            exit: "2026-04-04",
            pnl: 55,
            capital: 3100,
            result: "win",
        },
        {
            ticker: "SOFI",
            strategy: "CSP",
            entry: "2026-03-31",
            exit: "2026-04-04",
            pnl: 26,
            capital: 5800,
            result: "win",
        },
        {
            ticker: "PLTR",
            strategy: "CC",
            entry: "2026-03-31",
            exit: "2026-04-04",
            pnl: 195,
            capital: 7150,
            result: "win",
        },
        {
            ticker: "AMD",
            strategy: "CSP",
            entry: "2026-04-01",
            exit: "2026-04-05",
            pnl: -190,
            capital: 10500,
            result: "loss",
        },
    ],
};
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    CartesianGrid,
} from "recharts";

/* ─── Strike calculator helpers (self-contained) ─────────────────── */
function parseNum(v) {
    if (!v || v === "--" || v === "-") return null;
    const n = parseFloat(String(v).replace("%", ""));
    return isNaN(n) ? null : n;
}

function parseChain(raw) {
    const lines = raw.trim().split("\n");
    let lastPrice = null;
    const rows = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const priceMatch = trimmed.match(/Last\s*Price[:\s]+([0-9.]+)/i);
        if (priceMatch) {
            lastPrice = parseFloat(priceMatch[1]);
            continue;
        }
        const cols = trimmed.split("\t");
        if (cols.length < 13) continue;
        const strike = parseNum(cols[6]);
        if (strike === null) continue;
        rows.push({
            call: {
                last: parseNum(cols[0]),
                delta: parseNum(cols[1]),
                bid: parseNum(cols[2]),
                ask: parseNum(cols[3]),
                vol: parseNum(cols[4]),
                iv: parseNum(cols[5]),
            },
            strike,
            put: {
                iv: parseNum(cols[7]),
                vol: parseNum(cols[8]),
                bid: parseNum(cols[9]),
                ask: parseNum(cols[10]),
                delta: parseNum(cols[11]),
                last: parseNum(cols[12]),
            },
        });
    }
    return { lastPrice, rows };
}

function scoreStrikes(rows, isCSP, lastPrice, dte) {
    if (!lastPrice || !dte) return [];
    const candidates = rows.filter((row) => {
        const side = isCSP ? row.put : row.call;
        const delta = Math.abs(side.delta ?? 0);
        const mid =
            side.bid != null && side.ask != null
                ? (side.bid + side.ask) / 2
                : (side.last ?? 0);
        return (
            (isCSP ? row.strike < lastPrice : row.strike > lastPrice) &&
            delta > 0 &&
            mid > 0
        );
    });
    if (candidates.length === 0) return [];
    const scored = candidates.map((row) => {
        const side = isCSP ? row.put : row.call;
        const delta = Math.abs(side.delta ?? 0);
        const mid =
            side.bid != null && side.ask != null
                ? (side.bid + side.ask) / 2
                : (side.last ?? 0);
        const spread =
            side.bid != null && side.ask != null && mid > 0
                ? (side.ask - side.bid) / mid
                : 0.5;
        const capital = isCSP ? row.strike * 100 : lastPrice * 100;
        const annRet =
            capital > 0 ? ((mid * 100) / capital) * (365 / dte) * 100 : 0;
        const otmPct = (Math.abs(row.strike - lastPrice) / lastPrice) * 100;
        const breakEven = isCSP ? row.strike - mid : row.strike + mid;
        const bePct = (Math.abs(breakEven - lastPrice) / lastPrice) * 100;
        const deltaScore = Math.max(0, 100 - Math.abs(delta - 0.27) * 300);
        const retScore = Math.min(100, annRet * 2.5);
        const spreadScore = Math.max(0, 100 - spread * 200);
        const volScore = side.vol ? Math.min(100, side.vol * 2) : 20;
        const composite =
            retScore * 0.4 +
            deltaScore * 0.35 +
            spreadScore * 0.15 +
            volScore * 0.1;
        let profile, profileColor;
        if (delta >= 0.4) {
            profile = "Aggressive";
            profileColor = "text-red-400 bg-red-500/10 border-red-500/20";
        } else if (delta >= 0.28) {
            profile = "Balanced";
            profileColor = "text-green-400 bg-green-500/10 border-green-500/20";
        } else if (delta >= 0.15) {
            profile = "Conservative";
            profileColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
        } else {
            profile = "Far OTM";
            profileColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
        return {
            row,
            delta,
            mid,
            spread,
            annRet,
            otmPct,
            bePct,
            capital,
            composite,
            profile,
            profileColor,
            side,
        };
    });
    return scored.sort((a, b) => b.composite - a.composite);
}

function InfoTip({ children }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        function handle(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);
    return (
        <span ref={ref} className="relative inline-flex">
            <button
                onClick={() => setOpen((o) => !o)}
                className="text-slate-500 hover:text-slate-300 transition-colors align-middle"
                type="button"
            >
                <HelpCircle size={13} />
            </button>
            {open && (
                <div className="absolute z-50 left-5 top-0 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 text-xs text-slate-300 leading-relaxed">
                    {children}
                    <button
                        onClick={() => setOpen(false)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-base leading-none"
                    >
                        ×
                    </button>
                </div>
            )}
        </span>
    );
}

function ResultCard({ label, value, color = "text-slate-100", sub }) {
    return (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
            <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
        </div>
    );
}

function fmtCalc(n) {
    return n == null
        ? "—"
        : n.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
          });
}

function StrikeCalculator() {
    const [pasteText, setPasteText] = useState("");
    const [showPaste, setShowPaste] = useState(false);
    const [chainView, setChainView] = useState("analysis");
    const [calc, setCalc] = useState({
        stockPrice: "",
        type: "csp",
        strike: "",
        premium: "",
        contracts: "1",
        dte: "30",
    });
    function set(field, value) {
        setCalc((prev) => ({ ...prev, [field]: value }));
    }

    const chain = useMemo(
        () =>
            pasteText ? parseChain(pasteText) : { lastPrice: null, rows: [] },
        [pasteText],
    );
    const price = parseFloat(calc.stockPrice) || chain.lastPrice || 0;
    const strike = parseFloat(calc.strike) || 0;
    const premium = parseFloat(calc.premium) || 0;
    const contracts = parseInt(calc.contracts) || 1;
    const dte = parseInt(calc.dte) || 30;
    const isCSP = calc.type === "csp";

    const scored = useMemo(
        () => scoreStrikes(chain.rows, isCSP, chain.lastPrice || price, dte),
        [chain, isCSP, price, dte],
    );

    const totalPremium = premium * contracts * 100;
    const capitalNeeded = isCSP
        ? strike * contracts * 100
        : price * contracts * 100;
    const breakEven = isCSP ? strike - premium : strike + premium;
    const maxProfit = totalPremium;
    const annReturn =
        capitalNeeded > 0 && dte > 0
            ? (totalPremium / capitalNeeded) * (365 / dte) * 100
            : 0;
    const premiumYield =
        capitalNeeded > 0 ? (totalPremium / capitalNeeded) * 100 : 0;
    const otmPercent =
        price > 0 && strike > 0 ? (Math.abs(strike - price) / price) * 100 : 0;

    function selectStrike(row) {
        const side = isCSP ? row.put : row.call;
        const mid =
            side.bid != null && side.ask != null
                ? (side.bid + side.ask) / 2
                : (side.last ?? 0);
        set("strike", String(row.strike));
        set("premium", String(Math.round(mid * 100) / 100));
        if (chain.lastPrice && !calc.stockPrice)
            set("stockPrice", String(chain.lastPrice));
    }

    const inputCls =
        "w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500";
    const labelCls = "block text-xs text-slate-400 mb-1";

    return (
        <div className="space-y-5">
            {/* Chain card */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calculator size={16} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-slate-200">
                            Options Chain
                        </h3>
                        {chain.lastPrice && (
                            <span className="text-xs text-slate-500">
                                Last:{" "}
                                <span className="text-slate-300 font-mono">
                                    ${chain.lastPrice}
                                </span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {chain.rows.length > 0 && (
                            <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                                <button
                                    onClick={() => setChainView("analysis")}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chainView === "analysis" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                >
                                    Analysis
                                </button>
                                <button
                                    onClick={() => setChainView("chain")}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chainView === "chain" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                >
                                    Chain
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setShowPaste(!showPaste)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                            {showPaste
                                ? "Hide"
                                : chain.rows.length > 0
                                  ? "Edit"
                                  : "Paste Chain"}
                        </button>
                    </div>
                </div>

                {showPaste && (
                    <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">
                            Paste your options chain from your broker
                            (tab-separated). Calls on left, strike in middle,
                            puts on right.
                        </p>
                        <textarea
                            rows={6}
                            className={`${inputCls} font-mono text-xs`}
                            placeholder={
                                "Call Last\tDelta\tBid\tAsk\tVol\tIV\tSTRIKE\tIV\tVol\tBid\tAsk\tDelta\tPut Last\n2.32\t0.611\t2.25\t3.00\t27\t58.12%\t50\t54.92%\t220\t1.15\t1.30\t-0.385\t1.15\nLast Price: 50.97"
                            }
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                        />
                        {pasteText && (
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-slate-500">
                                    {chain.rows.length} strikes parsed
                                </span>
                                <button
                                    onClick={() => {
                                        setPasteText("");
                                        set("strike", "");
                                        set("premium", "");
                                    }}
                                    className="text-xs text-red-400 hover:text-red-300 ml-auto"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {chain.rows.length > 0 && chainView === "analysis" && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => set("type", "csp")}
                                className={`px-3 py-1.5 rounded text-xs font-medium ${isCSP ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                            >
                                CSP
                            </button>
                            <button
                                onClick={() => set("type", "cc")}
                                className={`px-3 py-1.5 rounded text-xs font-medium ${!isCSP ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                            >
                                Covered Call
                            </button>
                            <span className="text-xs text-slate-500 self-center ml-2">
                                DTE for ann. return:
                            </span>
                            <input
                                type="number"
                                min="1"
                                className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                                value={calc.dte}
                                onChange={(e) => set("dte", e.target.value)}
                            />
                        </div>
                        {scored.length === 0 ? (
                            <p className="text-xs text-slate-500 py-4 text-center">
                                No scoreable OTM strikes found. Make sure "Last
                                Price" is in your pasted data.
                            </p>
                        ) : (
                            <>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                        Top Picks —{" "}
                                        {isCSP
                                            ? "Cash-Secured Put"
                                            : "Covered Call"}
                                        <InfoTip>
                                            <p className="font-semibold mb-1">
                                                How strikes are scored
                                            </p>
                                            <p className="mb-1">
                                                Each OTM strike gets a 0–100
                                                composite score:
                                            </p>
                                            <ul className="space-y-1 mb-2">
                                                <li>
                                                    <span className="text-blue-300">
                                                        40%
                                                    </span>{" "}
                                                    — Annualized return
                                                </li>
                                                <li>
                                                    <span className="text-blue-300">
                                                        35%
                                                    </span>{" "}
                                                    — Delta fit (sweet spot
                                                    ~0.27)
                                                </li>
                                                <li>
                                                    <span className="text-blue-300">
                                                        15%
                                                    </span>{" "}
                                                    — Spread tightness
                                                </li>
                                                <li>
                                                    <span className="text-blue-300">
                                                        10%
                                                    </span>{" "}
                                                    — Volume
                                                </li>
                                            </ul>
                                        </InfoTip>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {scored.slice(0, 3).map((s, i) => {
                                            const labels = [
                                                "Best Overall",
                                                "Runner-up",
                                                "Alternative",
                                            ];
                                            return (
                                                <button
                                                    key={s.row.strike}
                                                    onClick={() =>
                                                        selectStrike(s.row)
                                                    }
                                                    className="text-left bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 rounded-xl p-3 transition-colors group"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                                            {labels[i]}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}
                                                        >
                                                            {s.profile}
                                                        </span>
                                                    </div>
                                                    <div className="text-xl font-bold text-slate-100 font-mono">
                                                        $
                                                        {s.row.strike.toFixed(
                                                            s.row.strike % 1
                                                                ? 2
                                                                : 0,
                                                        )}
                                                    </div>
                                                    <div className="mt-1 space-y-0.5">
                                                        {[
                                                            [
                                                                "Mid premium",
                                                                `$${s.mid.toFixed(2)}`,
                                                                "text-green-400",
                                                            ],
                                                            [
                                                                "Ann. return",
                                                                `${s.annRet.toFixed(1)}%`,
                                                                "text-blue-400",
                                                            ],
                                                            [
                                                                "Delta",
                                                                s.delta.toFixed(
                                                                    2,
                                                                ),
                                                                "text-slate-300",
                                                            ],
                                                            [
                                                                "% OTM",
                                                                `${s.otmPct.toFixed(1)}%`,
                                                                "text-slate-300",
                                                            ],
                                                            [
                                                                "Break-even",
                                                                `${s.bePct.toFixed(1)}% cushion`,
                                                                "text-slate-300",
                                                            ],
                                                        ].map(
                                                            ([
                                                                lbl,
                                                                val,
                                                                col,
                                                            ]) => (
                                                                <div
                                                                    key={lbl}
                                                                    className="flex justify-between text-xs"
                                                                >
                                                                    <span className="text-slate-500">
                                                                        {lbl}
                                                                    </span>
                                                                    <span
                                                                        className={`font-mono ${col}`}
                                                                    >
                                                                        {val}
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-blue-400 group-hover:text-blue-300 mt-2">
                                                        Click to load →
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                        All OTM Strikes — Ranked
                                    </p>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    {[
                                                        "#",
                                                        "Strike",
                                                        "Mid",
                                                        "Delta",
                                                        "% OTM",
                                                        "Ann. Return",
                                                        "BE Cushion",
                                                        "IV",
                                                        "Profile",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={`py-1.5 px-2 text-slate-500 font-medium ${h === "#" || h === "Profile" ? "text-left" : "text-right"}`}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scored.map((s, i) => {
                                                    const iv = isCSP
                                                        ? s.row.put.iv
                                                        : s.row.call.iv;
                                                    return (
                                                        <tr
                                                            key={s.row.strike}
                                                            onClick={() =>
                                                                selectStrike(
                                                                    s.row,
                                                                )
                                                            }
                                                            className={`border-b border-slate-800/50 cursor-pointer transition-colors ${strike === s.row.strike ? "bg-blue-500/15" : i < 3 ? "bg-green-500/5 hover:bg-green-500/10" : "hover:bg-slate-700/20"}`}
                                                        >
                                                            <td className="py-1.5 px-2 text-slate-500 font-medium">
                                                                {i === 0
                                                                    ? "★"
                                                                    : i + 1}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-slate-200 font-mono font-semibold">
                                                                $
                                                                {s.row.strike.toFixed(
                                                                    s.row
                                                                        .strike %
                                                                        1
                                                                        ? 2
                                                                        : 0,
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-green-400 font-mono">
                                                                $
                                                                {s.mid.toFixed(
                                                                    2,
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-slate-300 font-mono">
                                                                {s.delta.toFixed(
                                                                    2,
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-slate-400">
                                                                {s.otmPct.toFixed(
                                                                    1,
                                                                )}
                                                                %
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-blue-400 font-semibold">
                                                                {s.annRet.toFixed(
                                                                    1,
                                                                )}
                                                                %
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-slate-400">
                                                                {s.bePct.toFixed(
                                                                    1,
                                                                )}
                                                                %
                                                            </td>
                                                            <td className="py-1.5 px-2 text-right text-slate-500">
                                                                {iv != null
                                                                    ? iv.toFixed(
                                                                          1,
                                                                      ) + "%"
                                                                    : "--"}
                                                            </td>
                                                            <td className="py-1.5 px-2">
                                                                <span
                                                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${s.profileColor}`}
                                                                >
                                                                    {s.profile}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-2">
                                        Score: 40% ann. return · 35% delta
                                        (sweet spot ~0.27) · 15% spread · 10%
                                        volume. Click any row to load.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {chain.rows.length > 0 && chainView === "chain" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th
                                        colSpan={5}
                                        className="text-center py-1.5 text-amber-400 font-semibold text-[10px] uppercase tracking-wider"
                                    >
                                        Calls
                                    </th>
                                    <th className="py-1.5"></th>
                                    <th
                                        colSpan={5}
                                        className="text-center py-1.5 text-purple-400 font-semibold text-[10px] uppercase tracking-wider"
                                    >
                                        Puts
                                    </th>
                                </tr>
                                <tr className="border-b border-slate-700">
                                    {[
                                        "Delta",
                                        "Bid",
                                        "Ask",
                                        "Vol",
                                        "IV",
                                        "Strike",
                                        "IV",
                                        "Bid",
                                        "Ask",
                                        "Delta",
                                        "Vol",
                                    ].map((h, i) => (
                                        <th
                                            key={i}
                                            className={`py-1.5 px-1.5 text-slate-500 font-medium ${i === 5 ? "text-center text-slate-300 font-bold" : "text-right"}`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {chain.rows.map((row) => {
                                    const isATM =
                                        chain.lastPrice &&
                                        Math.abs(
                                            row.strike - chain.lastPrice,
                                        ) ===
                                            Math.min(
                                                ...chain.rows.map((r) =>
                                                    Math.abs(
                                                        r.strike -
                                                            chain.lastPrice,
                                                    ),
                                                ),
                                            );
                                    const putOTM = chain.lastPrice
                                        ? row.strike < chain.lastPrice
                                        : false;
                                    const callOTM = chain.lastPrice
                                        ? row.strike > chain.lastPrice
                                        : false;
                                    return (
                                        <tr
                                            key={row.strike}
                                            onClick={() => selectStrike(row)}
                                            className={`border-b border-slate-800/50 cursor-pointer transition-colors ${strike === row.strike ? "bg-blue-500/15" : isATM ? "bg-slate-700/30" : "hover:bg-slate-700/20"}`}
                                        >
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? "text-slate-500" : "text-amber-300"}`}
                                            >
                                                {row.call.delta?.toFixed(3) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? "text-slate-500" : "text-slate-300"}`}
                                            >
                                                {row.call.bid?.toFixed(2) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${callOTM ? "text-slate-500" : "text-slate-300"}`}
                                            >
                                                {row.call.ask?.toFixed(2) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right ${callOTM ? "text-slate-600" : "text-slate-400"}`}
                                            >
                                                {row.call.vol ?? "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right ${callOTM ? "text-slate-600" : "text-slate-400"}`}
                                            >
                                                {row.call.iv != null
                                                    ? row.call.iv.toFixed(1) +
                                                      "%"
                                                    : "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-2 text-center font-bold font-mono ${isATM ? "text-blue-400" : "text-slate-200"}`}
                                            >
                                                {row.strike.toFixed(
                                                    row.strike % 1 ? 2 : 0,
                                                )}
                                                {isATM && (
                                                    <span className="text-[9px] text-blue-500 ml-1">
                                                        ATM
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right ${putOTM ? "text-slate-600" : "text-slate-400"}`}
                                            >
                                                {row.put.iv != null
                                                    ? row.put.iv.toFixed(1) +
                                                      "%"
                                                    : "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? "text-slate-500" : "text-slate-300"}`}
                                            >
                                                {row.put.bid?.toFixed(2) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? "text-slate-500" : "text-slate-300"}`}
                                            >
                                                {row.put.ask?.toFixed(2) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right font-mono ${putOTM ? "text-slate-500" : "text-purple-300"}`}
                                            >
                                                {row.put.delta?.toFixed(3) ??
                                                    "--"}
                                            </td>
                                            <td
                                                className={`py-1.5 px-1.5 text-right ${putOTM ? "text-slate-600" : "text-slate-400"}`}
                                            >
                                                {row.put.vol ?? "--"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="text-[10px] text-slate-600 mt-2">
                            Click a strike to select it. Premium auto-fills from
                            the {isCSP ? "put" : "call"} mid price.
                        </p>
                    </div>
                )}
            </div>

            {/* Calculator */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">
                    Calculator
                </h3>
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => set("type", "csp")}
                        className={`px-4 py-1.5 rounded text-sm font-medium ${isCSP ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                    >
                        Cash-Secured Put
                    </button>
                    <button
                        onClick={() => set("type", "cc")}
                        className={`px-4 py-1.5 rounded text-sm font-medium ${!isCSP ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                    >
                        Covered Call
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div>
                        <label className={labelCls}>Stock Price</label>
                        <input
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder={
                                chain.lastPrice
                                    ? String(chain.lastPrice)
                                    : "150.00"
                            }
                            value={calc.stockPrice}
                            onChange={(e) => set("stockPrice", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Strike</label>
                        <input
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder="145.00"
                            value={calc.strike}
                            onChange={(e) => set("strike", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Premium (per share)</label>
                        <input
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder="2.50"
                            value={calc.premium}
                            onChange={(e) => set("premium", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Contracts</label>
                        <input
                            type="number"
                            min="1"
                            className={inputCls}
                            placeholder="1"
                            value={calc.contracts}
                            onChange={(e) => set("contracts", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>DTE (days)</label>
                        <input
                            type="number"
                            min="1"
                            className={inputCls}
                            placeholder="30"
                            value={calc.dte}
                            onChange={(e) => set("dte", e.target.value)}
                        />
                    </div>
                </div>
                {strike > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <ResultCard
                            label="% OTM"
                            value={`${otmPercent.toFixed(1)}%`}
                            sub={
                                price > 0
                                    ? `$${Math.abs(strike - price).toFixed(2)} from price`
                                    : ""
                            }
                        />
                        <ResultCard
                            label="Break-Even"
                            value={`$${breakEven.toFixed(2)}`}
                            sub={`${isCSP ? "-" : "+"}$${premium.toFixed(2)} from strike`}
                        />
                        <ResultCard
                            label="Max Profit"
                            value={fmtCalc(maxProfit)}
                            color="text-green-400"
                        />
                        <ResultCard
                            label="Capital Required"
                            value={fmtCalc(capitalNeeded)}
                        />
                        <ResultCard
                            label="Premium Yield"
                            value={`${premiumYield.toFixed(2)}%`}
                            sub={`for ${dte} days`}
                        />
                        <ResultCard
                            label="Annualized Return"
                            value={`${annReturn.toFixed(1)}%`}
                            color="text-blue-400"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

async function fetchPrice(symbol, apiKey) {
    const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.c || null;
}

const fmt$ = (n) =>
    n == null || isNaN(n)
        ? "—"
        : n.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
          });

const fmtPct = (n) =>
    n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function daysToExpiry(expiryStr) {
    return Math.max(
        0,
        Math.ceil((new Date(expiryStr) - new Date()) / 86400000),
    );
}

function daysBetween(a, b) {
    const d = Math.round((new Date(b) - new Date(a)) / 86400000);
    return d > 0 ? d : null; // null signals invalid date so ann return shows —
}

function fmtAnn(n) {
    if (n == null || isNaN(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Derive capital from explicit field or strike × contracts × 100
function tradeCapital(t) {
    if (t.capital > 0) return t.capital;
    if (t.strike > 0 && t.contracts > 0) return t.strike * t.contracts * 100;
    return null;
}

export default function MattCapital({ accountId = "default", userId }) {
    const apiKey = localStorage.getItem("bt_finnhub_key") || "";
    // ── Per-table state ────────────────────────────────────────────
    const [wheelPositions, setWheelPositions] = useState([]);
    const [stockPositions, setStockPositions] = useState([]);
    const [tradeLog, setTradeLog] = useState([]);
    const [settings, setSettings] = useState({ cash: 0, startDate: null });
    const [dataLoading, setDataLoading] = useState(false);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [dataError, setDataError] = useState(null);
    const [tab,         setTab]         = useState("portfolio");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || ""
            if (name) setDisplayName(name)
        })
    }, [])
    const [chartMode, setChartMode] = useState({});
    const [demoMode, setDemoMode] = useState(false);
    const [tradeForm, setTradeForm] = useState(null);
    const [editTradeId, setEditTradeId] = useState(null);
    const [wheelForm, setWheelForm] = useState(null);
    const [editWheelId, setEditWheelId] = useState(null);
    const [stockForm, setStockForm] = useState(null);
    const [editStockId, setEditStockId] = useState(null);
    const [wheelLogModal, setWheelLogModal] = useState(null); // { position, logForm }
    const [editingCash, setEditingCash] = useState(false);
    const [cashInput, setCashInput] = useState("");
    const [stockLogModal, setStockLogModal] = useState(null); // { position, logForm }

    // Load fund data from Supabase tables (or demo constant)
    useEffect(() => {
        if (demoMode) {
            setWheelPositions(
                DEMO_DATA.wheelPositions.map((p, i) => ({
                    id: `demo-w-${i}`,
                    ...p,
                })),
            );
            setStockPositions(
                DEMO_DATA.stockPositions.map((p, i) => ({
                    id: `demo-s-${i}`,
                    ...p,
                })),
            );
            setTradeLog(
                DEMO_DATA.tradeLog.map((t, i) => ({ id: `demo-t-${i}`, ...t })),
            );
            setSettings({
                cash: DEMO_DATA.cash,
                startDate: DEMO_DATA.startDate,
            });
            setDataError(null);
            return;
        }
        setDataLoading(true);
        setDataError(null);
        Promise.all([
            supabase
                .from("fund_wheel_positions")
                .select("*")
                .order("created_at"),
            supabase
                .from("fund_stock_positions")
                .select("*")
                .order("created_at"),
            supabase.from("fund_trade_log").select("*").order("created_at"),
            supabase.from("fund_settings").select("*").maybeSingle(),
        ]).then(([wheels, stocks, trades, s]) => {
            if (wheels.error || stocks.error || trades.error) {
                setDataError("Could not load fund data.");
                setDataLoading(false);
                return;
            }
            setWheelPositions(
                (wheels.data || []).map((r) => ({
                    id: r.id,
                    ticker: r.ticker,
                    type: r.type,
                    strike: r.strike,
                    entry: r.entry,
                    expiry: r.expiry,
                    premium: r.premium,
                    contracts: r.contracts,
                    notes: r.notes || '',
                })),
            );
            setStockPositions(
                (stocks.data || []).map((r) => ({
                    id: r.id,
                    ticker: r.ticker,
                    shares: r.shares,
                    entryPrice: r.entry_price,
                    notes: r.notes || '',
                })),
            );
            setTradeLog(
                (trades.data || []).map((r) => ({
                    id: r.id,
                    ticker: r.ticker,
                    strategy: r.strategy,
                    entry: r.entry,
                    exit: r.exit,
                    pnl: r.pnl,
                    result: r.result,
                    strike: r.strike,
                    contracts: r.contracts,
                    avgPrice: r.avg_price,
                    closePrice: r.close_price,
                    capital: r.capital,
                })),
            );
            setSettings({
                cash: s.data?.cash ?? 0,
                startDate: s.data?.start_date ?? null,
            });
            setDataLoading(false);
        });
    }, [demoMode]);

    const EMPTY_TRADE = {
        ticker: "",
        strategy: "CSP",
        entry: "",
        exit: "",
        strike: "",
        contracts: "",
        avgPrice: "",
        closePrice: "",
    };
    const EMPTY_WHEEL = {
        ticker: "",
        type: "CSP",
        strike: "",
        entry: "",
        expiry: "",
        premium: "",
        contracts: "",
        notes: "",
    };
    const EMPTY_STOCK = { ticker: "", shares: "", entryPrice: "", notes: "" };

    // ── Wheel helpers ──────────────────────────────────────────────
    function openAddWheel() {
        setEditWheelId(null);
        setWheelForm({ ...EMPTY_WHEEL });
    }
    function openEditWheel(id) {
        setEditWheelId(id);
        const p = wheelPositions.find((p) => p.id === id);
        setWheelForm({
            ticker: p.ticker || "",
            type: p.type || "CSP",
            strike: String(p.strike ?? ""),
            entry: p.entry || "",
            expiry: p.expiry || "",
            premium: String(p.premium ?? ""),
            contracts: String(p.contracts ?? ""),
            notes: p.notes || "",
        });
    }
    async function saveWheel() {
        if (demoMode) return;
        const f = wheelForm;
        const row = {
            ticker: f.ticker.toUpperCase().trim(),
            type: f.type,
            strike: parseFloat(f.strike),
            entry: f.entry,
            expiry: f.expiry,
            premium: parseFloat(f.premium),
            contracts: parseInt(f.contracts),
            notes: f.notes || null,
        };
        if (editWheelId) {
            await supabase
                .from("fund_wheel_positions")
                .update(row)
                .eq("id", editWheelId);
            setWheelPositions((prev) =>
                prev.map((p) =>
                    p.id === editWheelId ? { id: editWheelId, ...row, notes: f.notes || '' } : p,
                ),
            );
        } else {
            const { data } = await supabase
                .from("fund_wheel_positions")
                .insert(row)
                .select()
                .single();
            if (data)
                setWheelPositions((prev) => [...prev, { id: data.id, ...row, notes: f.notes || '' }]);
        }
        setWheelForm(null);
        setEditWheelId(null);
    }
    function deleteWheel(id) {
        if (demoMode) return;
        const p = wheelPositions.find((w) => w.id === id);
        if (!p) return;
        setWheelLogModal({
            position: p,
            logForm: {
                closePrice: "",
                exit: p.expiry || "",
            },
        });
    }
    async function confirmDeleteWheel(sendToLog) {
        const { position: p, logForm } = wheelLogModal;
        if (sendToLog) {
            const closeP =
                logForm.closePrice !== ""
                    ? parseFloat(logForm.closePrice)
                    : null;
            const pnl =
                closeP != null ? (p.premium - closeP) * p.contracts * 100 : 0;
            const row = {
                ticker: p.ticker,
                strategy: p.type,
                strike: p.strike,
                contracts: p.contracts,
                avg_price: p.premium,
                close_price: closeP,
                entry: p.entry || null,
                exit: logForm.exit || null,
                pnl,
                result: pnl >= 0 ? "win" : "loss",
            };
            const { data } = await supabase
                .from("fund_trade_log")
                .insert(row)
                .select()
                .single();
            if (data) {
                const local = {
                    ticker: row.ticker,
                    strategy: row.strategy,
                    strike: row.strike,
                    contracts: row.contracts,
                    avgPrice: row.avg_price,
                    closePrice: row.close_price,
                    entry: row.entry,
                    exit: row.exit,
                    pnl: row.pnl,
                    result: row.result,
                };
                setTradeLog((prev) => [...prev, { id: data.id, ...local }]);
            }
        }
        await supabase.from("fund_wheel_positions").delete().eq("id", p.id);
        setWheelPositions((prev) => prev.filter((w) => w.id !== p.id));
        setWheelLogModal(null);
    }

    // ── Stock helpers ──────────────────────────────────────────────
    function openAddStock() {
        setEditStockId(null);
        setStockForm({ ...EMPTY_STOCK });
    }
    function openEditStock(id) {
        setEditStockId(id);
        const p = stockPositions.find((p) => p.id === id);
        setStockForm({
            ticker: p.ticker || "",
            shares: String(p.shares ?? ""),
            entryPrice: String(p.entryPrice ?? ""),
            notes: p.notes || "",
        });
    }
    async function saveStock() {
        if (demoMode) return;
        const f = stockForm;
        const row = {
            ticker: f.ticker.toUpperCase().trim(),
            shares: parseFloat(f.shares),
            entry_price: parseFloat(f.entryPrice),
            notes: f.notes || null,
        };
        if (editStockId) {
            await supabase
                .from("fund_stock_positions")
                .update(row)
                .eq("id", editStockId);
            setStockPositions((prev) =>
                prev.map((p) =>
                    p.id === editStockId
                        ? {
                              id: editStockId,
                              ticker: row.ticker,
                              shares: row.shares,
                              entryPrice: row.entry_price,
                              notes: f.notes || '',
                          }
                        : p,
                ),
            );
        } else {
            const { data } = await supabase
                .from("fund_stock_positions")
                .insert(row)
                .select()
                .single();
            if (data)
                setStockPositions((prev) => [
                    ...prev,
                    {
                        id: data.id,
                        ticker: row.ticker,
                        shares: row.shares,
                        entryPrice: row.entry_price,
                        notes: f.notes || '',
                    },
                ]);
        }
        setStockForm(null);
        setEditStockId(null);
    }
    function deleteStock(id) {
        if (demoMode) return;
        const p = stockPositions.find((s) => s.id === id);
        if (!p) return;
        const current = prices[p.ticker];
        setStockLogModal({
            position: p,
            logForm: {
                exit: "",
                closePrice: current != null ? String(current) : "",
            },
        });
    }
    async function confirmDeleteStock(sendToLog) {
        const { position: p, logForm } = stockLogModal;
        if (sendToLog) {
            const closeP =
                logForm.closePrice !== ""
                    ? parseFloat(logForm.closePrice)
                    : null;
            const pnl = closeP != null ? (closeP - p.entryPrice) * p.shares : 0;
            const row = {
                ticker: p.ticker,
                strategy: "Stock",
                contracts: p.shares,
                avg_price: p.entryPrice,
                close_price: closeP,
                entry: null,
                exit: logForm.exit || null,
                pnl,
                result: pnl >= 0 ? "win" : "loss",
                strike: null,
            };
            const { data } = await supabase
                .from("fund_trade_log")
                .insert(row)
                .select()
                .single();
            if (data) {
                const local = {
                    ticker: row.ticker,
                    strategy: row.strategy,
                    contracts: row.contracts,
                    avgPrice: row.avg_price,
                    closePrice: row.close_price,
                    entry: row.entry,
                    exit: row.exit,
                    pnl: row.pnl,
                    result: row.result,
                    strike: null,
                };
                setTradeLog((prev) => [...prev, { id: data.id, ...local }]);
            }
        }
        await supabase.from("fund_stock_positions").delete().eq("id", p.id);
        setStockPositions((prev) => prev.filter((s) => s.id !== p.id));
        setStockLogModal(null);
    }

    // ── Trade helpers ──────────────────────────────────────────────
    function handleDemoPDF() {
        const DEMO_WHEEL = [
            { ticker: "SOFI",  type: "CSP", strike: 8,    premium: 0.18, contracts: 10, entry: "2025-03-01", expiry: "2025-03-21" },
            { ticker: "MSTR",  type: "CSP", strike: 280,  premium: 4.50, contracts: 2,  entry: "2025-03-03", expiry: "2025-03-28" },
            { ticker: "NVDA",  type: "CC",  strike: 900,  premium: 8.20, contracts: 1,  entry: "2025-03-10", expiry: "2025-04-04" },
            { ticker: "UNH",   type: "CSP", strike: 480,  premium: 5.10, contracts: 1,  entry: "2025-03-12", expiry: "2025-04-04" },
            { ticker: "XOM",   type: "CSP", strike: 110,  premium: 1.60, contracts: 3,  entry: "2025-03-17", expiry: "2025-04-17" },
            { ticker: "NEE",   type: "CSP", strike: 68,   premium: 0.90, contracts: 5,  entry: "2025-03-18", expiry: "2025-04-17" },
        ]
        const DEMO_STOCKS = [
            { ticker: "SOFI", shares: 500,  entryPrice: 7.42  },
            { ticker: "MSTR", shares: 10,   entryPrice: 265.00 },
            { ticker: "JNJ",  shares: 25,   entryPrice: 152.40 },
            { ticker: "KO",   shares: 100,  entryPrice: 61.80  },
            { ticker: "AMT",  shares: 15,   entryPrice: 188.50 },
        ]
        const DEMO_TRADES = [
            // Technology
            { ticker: "NVDA", strategy: "CSP", strike: 800,  contracts: 1, avgPrice: 9.50,  closePrice: 0.50,  entry: "2025-01-06", exit: "2025-01-24", pnl: 900,   result: "win"  },
            { ticker: "NVDA", strategy: "CSP", strike: 820,  contracts: 1, avgPrice: 10.20, closePrice: 15.00, entry: "2025-01-27", exit: "2025-02-07", pnl: -480,  result: "loss" },
            { ticker: "NVDA", strategy: "CC",  strike: 900,  contracts: 1, avgPrice: 8.80,  closePrice: 0.30,  entry: "2025-02-10", exit: "2025-02-28", pnl: 850,   result: "win"  },
            { ticker: "AAPL", strategy: "CSP", strike: 220,  contracts: 2, avgPrice: 2.10,  closePrice: 0.10,  entry: "2025-01-13", exit: "2025-01-31", pnl: 400,   result: "win"  },
            { ticker: "AAPL", strategy: "CC",  strike: 240,  contracts: 2, avgPrice: 1.80,  closePrice: 0.05,  entry: "2025-02-03", exit: "2025-02-14", pnl: 350,   result: "win"  },
            { ticker: "MSTR", strategy: "CSP", strike: 270,  contracts: 2, avgPrice: 5.20,  closePrice: 0.50,  entry: "2025-01-13", exit: "2025-01-31", pnl: 940,   result: "win"  },
            { ticker: "MSTR", strategy: "CSP", strike: 260,  contracts: 2, avgPrice: 4.80,  closePrice: 8.00,  entry: "2025-02-03", exit: "2025-02-21", pnl: -640,  result: "loss" },
            { ticker: "AMD",  strategy: "CSP", strike: 140,  contracts: 3, avgPrice: 2.10,  closePrice: 0.15,  entry: "2025-01-06", exit: "2025-01-24", pnl: 585,   result: "win"  },
            { ticker: "AMD",  strategy: "CC",  strike: 160,  contracts: 3, avgPrice: 1.60,  closePrice: 2.80,  entry: "2025-02-17", exit: "2025-02-28", pnl: -360,  result: "loss" },
            // Financial Services
            { ticker: "SOFI", strategy: "CSP", strike: 7.50, contracts: 10, avgPrice: 0.22, closePrice: 0.01, entry: "2025-01-06", exit: "2025-01-24", pnl: 210,   result: "win"  },
            { ticker: "SOFI", strategy: "CSP", strike: 7.00, contracts: 10, avgPrice: 0.18, closePrice: 0.01, entry: "2025-01-27", exit: "2025-02-14", pnl: 170,   result: "win"  },
            { ticker: "SOFI", strategy: "CC",  strike: 9.00, contracts: 5,  avgPrice: 0.15, closePrice: 0.01, entry: "2025-02-10", exit: "2025-02-28", pnl: 70,    result: "win"  },
            { ticker: "COIN", strategy: "CSP", strike: 200,  contracts: 2,  avgPrice: 4.20, closePrice: 0.30, entry: "2025-01-13", exit: "2025-01-31", pnl: 780,   result: "win"  },
            { ticker: "COIN", strategy: "CSP", strike: 190,  contracts: 2,  avgPrice: 3.80, closePrice: 6.50, entry: "2025-02-03", exit: "2025-02-14", pnl: -540,  result: "loss" },
            { ticker: "JPM",  strategy: "CSP", strike: 195,  contracts: 2,  avgPrice: 2.40, closePrice: 0.10, entry: "2025-01-06", exit: "2025-01-17", pnl: 460,   result: "win"  },
            { ticker: "JPM",  strategy: "CC",  strike: 220,  contracts: 2,  avgPrice: 1.90, closePrice: 0.05, entry: "2025-02-03", exit: "2025-02-21", pnl: 370,   result: "win"  },
            // Healthcare
            { ticker: "UNH",  strategy: "CSP", strike: 490,  contracts: 1, avgPrice: 5.80,  closePrice: 0.40,  entry: "2025-01-06", exit: "2025-01-24", pnl: 540,   result: "win"  },
            { ticker: "UNH",  strategy: "CSP", strike: 480,  contracts: 1, avgPrice: 4.90,  closePrice: 8.20,  entry: "2025-01-27", exit: "2025-02-07", pnl: -330,  result: "loss" },
            { ticker: "JNJ",  strategy: "CSP", strike: 150,  contracts: 2, avgPrice: 1.50,  closePrice: 0.10,  entry: "2025-01-13", exit: "2025-01-31", pnl: 280,   result: "win"  },
            { ticker: "JNJ",  strategy: "CC",  strike: 165,  contracts: 2, avgPrice: 1.20,  closePrice: 0.05,  entry: "2025-02-03", exit: "2025-02-21", pnl: 230,   result: "win"  },
            // Energy
            { ticker: "XOM",  strategy: "CSP", strike: 112,  contracts: 3, avgPrice: 1.80,  closePrice: 0.10,  entry: "2025-01-06", exit: "2025-01-17", pnl: 510,   result: "win"  },
            { ticker: "XOM",  strategy: "CC",  strike: 120,  contracts: 3, avgPrice: 1.40,  closePrice: 0.05,  entry: "2025-01-27", exit: "2025-02-14", pnl: 405,   result: "win"  },
            { ticker: "CVX",  strategy: "CSP", strike: 148,  contracts: 2, avgPrice: 2.10,  closePrice: 3.80,  entry: "2025-02-03", exit: "2025-02-14", pnl: -340,  result: "loss" },
            { ticker: "CVX",  strategy: "CSP", strike: 145,  contracts: 2, avgPrice: 1.90,  closePrice: 0.15,  entry: "2025-02-17", exit: "2025-02-28", pnl: 350,   result: "win"  },
            // Consumer Cyclical
            { ticker: "TSLA", strategy: "CSP", strike: 350,  contracts: 1, avgPrice: 6.50,  closePrice: 1.00,  entry: "2025-01-06", exit: "2025-01-17", pnl: 550,   result: "win"  },
            { ticker: "TSLA", strategy: "CSP", strike: 340,  contracts: 1, avgPrice: 7.20,  closePrice: 12.00, entry: "2025-01-27", exit: "2025-02-07", pnl: -480,  result: "loss" },
            { ticker: "AMZN", strategy: "CSP", strike: 195,  contracts: 1, avgPrice: 2.80,  closePrice: 0.20,  entry: "2025-01-13", exit: "2025-01-31", pnl: 260,   result: "win"  },
            { ticker: "AMZN", strategy: "CC",  strike: 220,  contracts: 1, avgPrice: 2.40,  closePrice: 0.10,  entry: "2025-02-03", exit: "2025-02-21", pnl: 230,   result: "win"  },
            // Consumer Defensive
            { ticker: "KO",   strategy: "CSP", strike: 62,   contracts: 5, avgPrice: 0.70,  closePrice: 0.05,  entry: "2025-01-06", exit: "2025-01-24", pnl: 325,   result: "win"  },
            { ticker: "KO",   strategy: "CC",  strike: 68,   contracts: 5, avgPrice: 0.55,  closePrice: 0.03,  entry: "2025-02-03", exit: "2025-02-21", pnl: 260,   result: "win"  },
            { ticker: "PG",   strategy: "CSP", strike: 160,  contracts: 2, avgPrice: 1.60,  closePrice: 0.10,  entry: "2025-01-13", exit: "2025-01-31", pnl: 300,   result: "win"  },
            // Utilities
            { ticker: "NEE",  strategy: "CSP", strike: 70,   contracts: 5, avgPrice: 1.00,  closePrice: 0.08,  entry: "2025-01-06", exit: "2025-01-17", pnl: 460,   result: "win"  },
            { ticker: "NEE",  strategy: "CC",  strike: 76,   contracts: 5, avgPrice: 0.75,  closePrice: 0.05,  entry: "2025-01-27", exit: "2025-02-14", pnl: 350,   result: "win"  },
            // Real Estate
            { ticker: "AMT",  strategy: "CSP", strike: 185,  contracts: 2, avgPrice: 2.20,  closePrice: 0.15,  entry: "2025-01-13", exit: "2025-01-31", pnl: 410,   result: "win"  },
            { ticker: "PLD",  strategy: "CSP", strike: 118,  contracts: 3, avgPrice: 1.40,  closePrice: 2.60,  entry: "2025-02-03", exit: "2025-02-14", pnl: -360,  result: "loss" },
            // Communication Services
            { ticker: "META", strategy: "CSP", strike: 580,  contracts: 1, avgPrice: 7.20,  closePrice: 0.50,  entry: "2025-01-06", exit: "2025-01-24", pnl: 670,   result: "win"  },
            { ticker: "META", strategy: "CC",  strike: 640,  contracts: 1, avgPrice: 5.80,  closePrice: 0.20,  entry: "2025-02-03", exit: "2025-02-21", pnl: 560,   result: "win"  },
            // Industrials
            { ticker: "CAT",  strategy: "CSP", strike: 340,  contracts: 1, avgPrice: 4.10,  closePrice: 0.30,  entry: "2025-01-13", exit: "2025-01-31", pnl: 380,   result: "win"  },
            { ticker: "CAT",  strategy: "CSP", strike: 330,  contracts: 1, avgPrice: 3.80,  closePrice: 6.40,  entry: "2025-02-03", exit: "2025-02-14", pnl: -260,  result: "loss" },
            // ETF / Index
            { ticker: "SPY",  strategy: "Iron Condor", strike: 575, contracts: 1, avgPrice: 4.50, closePrice: 1.00, entry: "2025-01-21", exit: "2025-01-31", pnl: 350, result: "win" },
            { ticker: "SPY",  strategy: "Iron Condor", strike: 570, contracts: 1, avgPrice: 4.80, closePrice: 0.80, entry: "2025-02-03", exit: "2025-02-14", pnl: 400, result: "win" },
            { ticker: "QQQ",  strategy: "CSP", strike: 490,  contracts: 1, avgPrice: 3.80,  closePrice: 0.30,  entry: "2025-01-13", exit: "2025-01-24", pnl: 350,   result: "win"  },
        ]
        const DEMO_SECTOR_MAP = {
            NVDA: "Technology",          AAPL: "Technology",        MSTR: "Technology",        AMD: "Technology",
            SOFI: "Financial Services",  COIN: "Financial Services", JPM: "Financial Services",
            UNH:  "Healthcare",          JNJ:  "Healthcare",
            XOM:  "Energy",              CVX:  "Energy",
            TSLA: "Consumer Cyclical",   AMZN: "Consumer Cyclical",
            KO:   "Consumer Defensive",  PG:   "Consumer Defensive",
            NEE:  "Utilities",
            AMT:  "Real Estate",         PLD:  "Real Estate",
            META: "Communication Svcs",
            CAT:  "Industrials",
            SPY:  "ETF / Index",         QQQ:  "ETF / Index",
        }
        exportFundPDF({
            wheelPositions: DEMO_WHEEL,
            stockPositions: DEMO_STOCKS,
            tradeLog: DEMO_TRADES,
            cash: 12500,
            prices: { SOFI: 8.15, MSTR: 295, NVDA: 875, COIN: 198, AAPL: 228, TSLA: 385, AMD: 152, SPY: 592, QQQ: 508, UNH: 492, XOM: 114, NEE: 71, JNJ: 158, KO: 64, AMT: 195, JPM: 210, CVX: 150, AMZN: 202, PG: 167, META: 608, CAT: 345, PLD: 121 },
            sectorMap: DEMO_SECTOR_MAP,
        })
    }

    async function handleExportPDF() {
        setPdfLoading(true)
        const allTickers = [...new Set([
            ...tradeLog.map(t => t.ticker),
            ...stockPositions.map(p => p.ticker),
            ...wheelPositions.map(p => p.ticker),
        ])].filter(Boolean)
        const sectorMap = {}
        if (apiKey && allTickers.length > 0) {
            await Promise.all(allTickers.map(async ticker => {
                try {
                    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`)
                    const data = await res.json()
                    sectorMap[ticker] = data.finnhubIndustry || 'Unknown'
                } catch {
                    sectorMap[ticker] = 'Unknown'
                }
            }))
        }
        exportFundPDF({ wheelPositions, stockPositions, tradeLog, cash, prices, sectorMap })
        setPdfLoading(false)
    }

    function openAddTrade() {
        setEditTradeId(null);
        setTradeForm({ ...EMPTY_TRADE });
    }
    function openEditTrade(id) {
        setEditTradeId(id);
        const t = tradeLog.find((t) => t.id === id);
        setTradeForm({
            ticker: t.ticker || "",
            strategy: t.strategy || "CSP",
            entry: t.entry || "",
            exit: t.exit || "",
            strike: String(t.strike ?? ""),
            contracts: String(t.contracts ?? ""),
            avgPrice: String(t.avgPrice ?? ""),
            closePrice: String(t.closePrice ?? ""),
        });
    }
    async function saveTrade() {
        if (demoMode) return;
        const f = tradeForm;
        const avgP = f.avgPrice !== "" ? parseFloat(f.avgPrice) : null;
        const closeP = f.closePrice !== "" ? parseFloat(f.closePrice) : null;
        const contracts = f.contracts !== "" ? parseInt(f.contracts) : null;
        const isStock = f.strategy === "Stock";
        const pnl =
            avgP != null && closeP != null && contracts != null
                ? isStock
                    ? (closeP - avgP) * contracts
                    : (avgP - closeP) * contracts * 100
                : 0;
        const result = pnl >= 0 ? "win" : "loss";
        const row = {
            ticker: f.ticker.toUpperCase().trim(),
            strategy: f.strategy,
            entry: f.entry || null,
            exit: f.exit || null,
            pnl,
            result,
            strike: f.strike !== "" ? parseFloat(f.strike) : null,
            contracts,
            avg_price: avgP,
            close_price: closeP,
        };
        const local = {
            ticker: row.ticker,
            strategy: row.strategy,
            entry: row.entry,
            exit: row.exit,
            pnl: row.pnl,
            result: row.result,
            strike: row.strike,
            contracts: row.contracts,
            avgPrice: row.avg_price,
            closePrice: row.close_price,
        };
        if (editTradeId) {
            await supabase
                .from("fund_trade_log")
                .update(row)
                .eq("id", editTradeId);
            setTradeLog((prev) =>
                prev.map((t) =>
                    t.id === editTradeId ? { id: editTradeId, ...local } : t,
                ),
            );
        } else {
            const { data } = await supabase
                .from("fund_trade_log")
                .insert(row)
                .select()
                .single();
            if (data)
                setTradeLog((prev) => [...prev, { id: data.id, ...local }]);
        }
        setTradeForm(null);
        setEditTradeId(null);
    }
    async function deleteTrade(id) {
        if (demoMode || !confirm("Delete this trade?")) return;
        await supabase.from("fund_trade_log").delete().eq("id", id);
        setTradeLog((prev) => prev.filter((t) => t.id !== id));
    }

    async function saveCash(val) {
        const n = parseFloat(val) || 0;
        setSettings((s) => ({ ...s, cash: n }));
        setEditingCash(false);
        // upsert — fund_settings has at most one row
        const { data: existing } = await supabase
            .from("fund_settings")
            .select("id")
            .maybeSingle();
        if (existing) {
            await supabase
                .from("fund_settings")
                .update({ cash: n })
                .eq("id", existing.id);
        } else {
            await supabase.from("fund_settings").insert({ cash: n });
        }
    }

    async function loadPrices() {
        if (!apiKey) return;
        setLoading(true);
        const tickers = [
            ...new Set([
                ...stockPositions.map((p) => p.ticker),
                ...wheelPositions.map((p) => p.ticker),
            ]),
        ];
        const result = {};
        for (const sym of tickers) {
            const price = await fetchPrice(sym, apiKey);
            if (price) result[sym] = price;
            await new Promise((r) => setTimeout(r, 150));
        }
        setPrices(result);
        setLoading(false);
    }

    useEffect(() => {
        if (
            !dataLoading &&
            (wheelPositions.length > 0 || stockPositions.length > 0)
        )
            loadPrices();
    }, [dataLoading]); // eslint-disable-line

    if (dataError)
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
                {dataError}
            </div>
        );
    if (dataLoading)
        return (
            <div className="text-center text-slate-500 py-16 text-sm animate-pulse">
                Loading fund data…
            </div>
        );

    const cash = settings.cash ?? 0;
    const startDate = settings.startDate;

    // ── Derived stats ──────────────────────────────────────────────
    const stockValue = stockPositions.reduce(
        (s, p) => s + (prices[p.ticker] ?? p.entryPrice) * p.shares,
        0,
    );

    const premiumCollected = wheelPositions.reduce(
        (s, p) => s + p.premium * p.contracts * 100,
        0,
    );
    const closedPnl = tradeLog.reduce((s, t) => s + t.pnl, 0);

    // Unrealized P&L: wheel premium collected + stock mark-to-market gain/loss
    const wheelUnrealizedPnl = premiumCollected;
    const stockUnrealizedPnl = stockPositions.reduce(
        (s, p) =>
            s + ((prices[p.ticker] ?? p.entryPrice) - p.entryPrice) * p.shares,
        0,
    );
    const unrealizedPnl = wheelUnrealizedPnl + stockUnrealizedPnl;

    const totalValue = stockValue + premiumCollected + cash + closedPnl;

    const wins = tradeLog.filter((t) => t.result === "win").length;
    const winRate = tradeLog.length > 0 ? (wins / tradeLog.length) * 100 : 0;

    // Annual return per closed trade
    const tradeAnnReturns = tradeLog
        .filter((t) => tradeCapital(t) > 0)
        .map((t) => {
            const dur = daysBetween(t.entry, t.exit);
            const cap = tradeCapital(t);
            return dur && cap ? (t.pnl / cap) * (365 / dur) * 100 : null;
        })
        .filter((v) => v != null);

    // Annual return per active wheel position — fixed to entry→expiry duration
    const wheelAnnReturns = wheelPositions
        .map((p) => {
            const duration = p.entry
                ? Math.max(1, daysBetween(p.entry, p.expiry))
                : null;
            return duration
                ? (p.premium / p.strike) * (365 / duration) * 100
                : null;
        })
        .filter(Boolean);

    // Portfolio annualised return — average across all positions with known capital
    const allAnnReturns = [...tradeAnnReturns, ...wheelAnnReturns];
    const portfolioAnnReturn =
        allAnnReturns.length > 0
            ? allAnnReturns.reduce((s, r) => s + r, 0) / allAnnReturns.length
            : null;

    // Actual return: total gains vs starting capital (cash + stock cost basis)
    const stockCostBasis = stockPositions.reduce(
        (s, p) => s + p.shares * p.entryPrice,
        0,
    );
    const startingCapital = cash + stockCostBasis;
    const totalGains = closedPnl + unrealizedPnl;
    const actualReturnPct =
        startingCapital > 0 ? (totalGains / startingCapital) * 100 : null;

    return (
        <div className="space-y-6">
            {/* Fund Header */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                            MATT Capital
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDemoPDF}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-300 bg-slate-700 border border-slate-600 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <FileText size={12} />
                            Demo PDF
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={pdfLoading}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-300 bg-slate-700 border border-slate-600 hover:border-red-500/40 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                        >
                            <FileText size={12} className={pdfLoading ? "animate-pulse" : ""} />
                            {pdfLoading ? "Building…" : "PDF"}
                        </button>
                        <button
                            onClick={() => loadPrices()}
                            disabled={loading || !apiKey}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                        >
                            <RefreshCw
                                size={12}
                                className={loading ? "animate-spin" : ""}
                            />
                            {loading ? "Refreshing…" : "Refresh"}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-6">
                    {[
                        {
                            label: "Portfolio Value",
                            value: fmt$(totalValue),
                            color: "text-slate-100",
                        },
                        {
                            label: "Unrealized P&L",
                            value: fmt$(unrealizedPnl),
                            color:
                                unrealizedPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "Realized P&L",
                            value: fmt$(closedPnl),
                            color:
                                closedPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "Actual Return",
                            value:
                                actualReturnPct != null
                                    ? fmtAnn(actualReturnPct)
                                    : "—",
                            color:
                                actualReturnPct == null
                                    ? "text-slate-400"
                                    : actualReturnPct >= 0
                                      ? "text-emerald-400"
                                      : "text-red-400",
                        },
                        {
                            label: "AVG Ann. Return",
                            value: fmtAnn(portfolioAnnReturn),
                            color:
                                portfolioAnnReturn == null
                                    ? "text-slate-400"
                                    : portfolioAnnReturn >= 0
                                      ? "text-emerald-400"
                                      : "text-red-400",
                        },
                        {
                            label: "Win Rate",
                            value:
                                tradeLog.length > 0
                                    ? `${winRate.toFixed(0)}%`
                                    : "—",
                            color: "text-blue-400",
                        },
                    ].map(({ label, value, color }) => (
                        <div key={label}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                {label}
                            </p>
                            <p
                                className={`text-xl font-bold tabular-nums ${color}`}
                            >
                                {value}
                            </p>
                        </div>
                    ))}

                    {/* Cash — editable */}
                    {!demoMode && (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                Cash
                            </p>
                            {editingCash ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        saveCash(cashInput);
                                    }}
                                    className="flex items-center gap-1"
                                >
                                    <input
                                        autoFocus
                                        type="number"
                                        value={cashInput}
                                        onChange={(e) =>
                                            setCashInput(e.target.value)
                                        }
                                        onBlur={() => saveCash(cashInput)}
                                        className="w-24 bg-slate-700/60 border border-blue-500/50 rounded px-2 py-0.5 text-sm text-white tabular-nums focus:outline-none"
                                    />
                                </form>
                            ) : (
                                <button
                                    onClick={() => {
                                        setCashInput(String(cash));
                                        setEditingCash(true);
                                    }}
                                    title="Click to edit"
                                    className="text-xl font-bold tabular-nums text-slate-300 hover:text-white transition-colors text-left"
                                >
                                    {fmt$(cash)}
                                </button>
                            )}
                        </div>
                    )}
                    {demoMode && (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                Cash
                            </p>
                            <p className="text-xl font-bold tabular-nums text-slate-300">
                                {fmt$(cash)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab bar */}
            <div>
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 bg-slate-800/50 rounded-xl p-1 ring-1 ring-white/[0.06]">
                    {[
                        ["portfolio", "Portfolio"],
                        ["statistics", "Statistics"],
                        ["strikes", "Strikes"],
                        ["screener", "Screener"],
                        ["watchlist", "Watchlist"],
                        ["debate",    "Debate"],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                tab === id
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "portfolio" && (
                <>
                    <WatchlistSummary userId={userId} />

                    {/* Wheel Positions */}
                    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Active Option Positions
                            </p>
                            {!demoMode && (
                                <button
                                    onClick={openAddWheel}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    <Plus size={12} /> Add Position
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        {[
                                            "Ticker",
                                            "Type",
                                            "Stock Price",
                                            "Strike",
                                            "DTE",
                                            "Expiry",
                                            "Contracts",
                                            "Premium",
                                            "Value",
                                            "Ann. Return",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                        {!demoMode && (
                                            <th className="px-2 py-2.5" />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {wheelPositions.map((p, i) => {
                                        const dte = daysToExpiry(p.expiry);
                                        const value =
                                            p.premium * p.contracts * 100;
                                        const duration = p.entry
                                            ? Math.max(
                                                  1,
                                                  daysBetween(
                                                      p.entry,
                                                      p.expiry,
                                                  ),
                                              )
                                            : null;
                                        const ann = duration
                                            ? (p.premium / p.strike) *
                                              (365 / duration) *
                                              100
                                            : null;
                                        const priceColor =
                                            prices[p.ticker] == null
                                                ? "text-slate-400"
                                                : (
                                                        p.type === "CSP"
                                                            ? prices[
                                                                  p.ticker
                                                              ] >= p.strike
                                                            : prices[
                                                                  p.ticker
                                                              ] <= p.strike
                                                    )
                                                  ? "text-emerald-400"
                                                  : "text-red-400";
                                        return (
                                            <tr
                                                key={i}
                                                className="group border-b border-white/[0.03] hover:bg-white/[0.02]"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-100">{p.ticker}</span>
                                                    {p.notes && <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[120px] truncate">{p.notes}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.type === "CSP" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}
                                                    >
                                                        {p.type}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`px-4 py-3 tabular-nums font-semibold ${priceColor}`}
                                                >
                                                    {prices[p.ticker]
                                                        ? fmt$(prices[p.ticker])
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-200">
                                                    {fmt$(p.strike)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 font-semibold tabular-nums ${dte <= 7 ? "text-red-400" : dte <= 21 ? "text-yellow-400" : "text-slate-300"}`}
                                                >
                                                    {dte}d
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">
                                                    {p.expiry}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-300">
                                                    {p.contracts}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-emerald-400">
                                                    {fmt$(p.premium)}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                                                    {fmt$(value)}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums font-semibold text-blue-400">
                                                    {fmtAnn(ann)}
                                                </td>
                                                {!demoMode && (
                                                    <td className="px-2 py-3">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() =>
                                                                    openEditWheel(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="p-1 text-slate-500 hover:text-slate-200 rounded"
                                                            >
                                                                <Pencil
                                                                    size={13}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    deleteWheel(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="p-1 text-slate-500 hover:text-red-400 rounded"
                                                            >
                                                                <Trash2
                                                                    size={13}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {wheelPositions.length > 0 &&
                                    (() => {
                                        const totContracts =
                                            wheelPositions.reduce(
                                                (s, p) => s + p.contracts,
                                                0,
                                            );
                                        const totValue = wheelPositions.reduce(
                                            (s, p) =>
                                                s +
                                                p.premium * p.contracts * 100,
                                            0,
                                        );
                                        const annReturns = wheelPositions
                                            .map((p) => {
                                                const duration = p.entry
                                                    ? Math.max(
                                                          1,
                                                          daysBetween(
                                                              p.entry,
                                                              p.expiry,
                                                          ),
                                                      )
                                                    : null;
                                                return duration
                                                    ? (p.premium / p.strike) *
                                                          (365 / duration) *
                                                          100
                                                    : null;
                                            })
                                            .filter((v) => v != null);
                                        const avgAnn =
                                            annReturns.length > 0
                                                ? annReturns.reduce(
                                                      (s, v) => s + v,
                                                      0,
                                                  ) / annReturns.length
                                                : null;
                                        return (
                                            <tfoot>
                                                <tr className="border-t-2 border-slate-600/60 bg-white/[0.02]">
                                                    <td
                                                        className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                                        colSpan={6}
                                                    >
                                                        Total
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-200">
                                                        {totContracts}
                                                    </td>
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-emerald-400">
                                                        {fmt$(totValue)}
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-blue-400">
                                                        {fmtAnn(avgAnn)}
                                                    </td>
                                                    {!demoMode && <td />}
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                            </table>
                        </div>
                    </div>

                    {/* Stock Positions */}
                    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Stock Positions
                            </p>
                            {!demoMode && (
                                <button
                                    onClick={openAddStock}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    <Plus size={12} /> Add Stock
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        {[
                                            "Ticker",
                                            "Shares",
                                            "Entry Price",
                                            "Current Price",
                                            "Market Value",
                                            "P&L $",
                                            "P&L %",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                        {!demoMode && (
                                            <th className="px-2 py-2.5" />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockPositions.map((p, i) => {
                                        const current =
                                            prices[p.ticker] ?? null;
                                        const mktValue =
                                            current != null
                                                ? current * p.shares
                                                : null;
                                        const pnlD =
                                            current != null
                                                ? (current - p.entryPrice) *
                                                  p.shares
                                                : null;
                                        const pnlPct =
                                            current != null
                                                ? ((current - p.entryPrice) /
                                                      p.entryPrice) *
                                                  100
                                                : null;
                                        const color =
                                            pnlD == null
                                                ? "text-slate-400"
                                                : pnlD >= 0
                                                  ? "text-emerald-400"
                                                  : "text-red-400";
                                        return (
                                            <tr
                                                key={i}
                                                className="group border-b border-white/[0.03] hover:bg-white/[0.02]"
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-100">{p.ticker}</span>
                                                    {p.notes && <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[120px] truncate">{p.notes}</p>}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-300">
                                                    {p.shares.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-400">
                                                    {fmt$(p.entryPrice)}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-200">
                                                    {current
                                                        ? fmt$(current)
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums text-slate-200">
                                                    {mktValue != null
                                                        ? fmt$(mktValue)
                                                        : "—"}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                                >
                                                    {pnlD != null
                                                        ? fmt$(pnlD)
                                                        : "—"}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                                >
                                                    {pnlPct != null
                                                        ? fmtPct(pnlPct)
                                                        : "—"}
                                                </td>
                                                {!demoMode && (
                                                    <td className="px-2 py-3">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() =>
                                                                    openEditStock(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="p-1 text-slate-500 hover:text-slate-200 rounded"
                                                            >
                                                                <Pencil
                                                                    size={13}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    deleteStock(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="p-1 text-slate-500 hover:text-red-400 rounded"
                                                            >
                                                                <Trash2
                                                                    size={13}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {stockPositions.length > 0 &&
                                    (() => {
                                        const totShares = stockPositions.reduce(
                                            (s, p) => s + p.shares,
                                            0,
                                        );
                                        const totCostBasis =
                                            stockPositions.reduce(
                                                (s, p) =>
                                                    s + p.entryPrice * p.shares,
                                                0,
                                            );
                                        const totMktValue =
                                            stockPositions.every(
                                                (p) => prices[p.ticker] != null,
                                            )
                                                ? stockPositions.reduce(
                                                      (s, p) =>
                                                          s +
                                                          prices[p.ticker] *
                                                              p.shares,
                                                      0,
                                                  )
                                                : null;
                                        const totPnl =
                                            totMktValue != null
                                                ? totMktValue - totCostBasis
                                                : null;
                                        const totPct =
                                            totPnl != null && totCostBasis > 0
                                                ? (totPnl / totCostBasis) * 100
                                                : null;
                                        const color =
                                            totPnl == null
                                                ? "text-slate-400"
                                                : totPnl >= 0
                                                  ? "text-emerald-400"
                                                  : "text-red-400";
                                        return (
                                            <tfoot>
                                                <tr className="border-t-2 border-slate-600/60 bg-white/[0.02]">
                                                    <td className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                                        Total
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-200">
                                                        {totShares.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                                                        {fmt$(
                                                            totCostBasis /
                                                                totShares,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-200">
                                                        {totMktValue != null
                                                            ? fmt$(totMktValue)
                                                            : "—"}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-2.5 tabular-nums font-semibold ${color}`}
                                                    >
                                                        {totPnl != null
                                                            ? fmt$(totPnl)
                                                            : "—"}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-2.5 tabular-nums font-semibold ${color}`}
                                                    >
                                                        {totPct != null
                                                            ? fmtPct(totPct)
                                                            : "—"}
                                                    </td>
                                                    {!demoMode && <td />}
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                            </table>
                        </div>
                    </div>

                    {/* Trade Log */}
                    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Trade Log
                            </p>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-400">
                                    {tradeLog.length} trades ·{" "}
                                    <span className="text-emerald-400">
                                        {wins}W
                                    </span>
                                    {" / "}
                                    <span className="text-red-400">
                                        {
                                            tradeLog.filter(
                                                (t) => t.result === "loss",
                                            ).length
                                        }
                                        L
                                    </span>
                                </span>
                                <span
                                    className={`font-semibold ${closedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                >
                                    {fmt$(closedPnl)}
                                </span>
                                {!demoMode && (
                                    <button
                                        onClick={openAddTrade}
                                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors"
                                    >
                                        <Plus size={12} /> Add Trade
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.05]">
                                        {[
                                            "Ticker",
                                            "Strategy",
                                            "Contracts",
                                            "Strike",
                                            "Avg Price",
                                            "Close Price",
                                            "DTE",
                                            "Entry",
                                            "Exit",
                                            "P&L",
                                            "Ann. Return",
                                            "Result",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                        {!demoMode && (
                                            <th className="px-2 py-2.5" />
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tradeLog
                                        .slice()
                                        .reverse()
                                        .map((t) => {
                                            const cap = tradeCapital(t);
                                            const dur = daysBetween(
                                                t.entry,
                                                t.exit,
                                            );
                                            const ann =
                                                cap > 0 && dur
                                                    ? (t.pnl / cap) *
                                                      (365 / dur) *
                                                      100
                                                    : null;
                                            return (
                                                <tr
                                                    key={t.id}
                                                    className="group border-b border-white/[0.03] hover:bg-white/[0.02]"
                                                >
                                                    <td className="px-4 py-3 font-bold text-slate-100">
                                                        {t.ticker}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400">
                                                        {t.strategy}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                                                        {t.contracts != null
                                                            ? t.contracts
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                                                        {t.strike != null
                                                            ? `$${t.strike}`
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                                                        {t.avgPrice != null
                                                            ? `$${t.avgPrice}`
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 tabular-nums text-slate-400">
                                                        {t.closePrice != null
                                                            ? `$${t.closePrice}`
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 tabular-nums text-slate-400">
                                                        {dur ? `${dur}d` : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {t.entry}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                                        {t.exit}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 tabular-nums font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                    >
                                                        {fmt$(t.pnl)}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-3 tabular-nums font-semibold ${ann == null ? "text-slate-500" : ann >= 0 ? "text-blue-400" : "text-red-400"}`}
                                                    >
                                                        {fmtAnn(ann)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.result === "win" ? "bg-emerald-500/20 text-emerald-400" : t.result === "loss" ? "bg-red-500/20 text-red-400" : "bg-slate-600/40 text-slate-400"}`}
                                                        >
                                                            {t.result
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                t.result.slice(
                                                                    1,
                                                                )}
                                                        </span>
                                                    </td>
                                                    {!demoMode && (
                                                        <td className="px-2 py-3">
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() =>
                                                                        openEditTrade(
                                                                            t.id,
                                                                        )
                                                                    }
                                                                    className="p-1 text-slate-500 hover:text-slate-200 rounded transition-colors"
                                                                >
                                                                    <Pencil
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        deleteTrade(
                                                                            t.id,
                                                                        )
                                                                    }
                                                                    className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            13
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                </tbody>
                                {tradeLog.length > 0 &&
                                    (() => {
                                        const totContracts = tradeLog.reduce(
                                            (s, t) => s + (t.contracts ?? 0),
                                            0,
                                        );
                                        const totPnl = tradeLog.reduce(
                                            (s, t) => s + t.pnl,
                                            0,
                                        );
                                        const wins = tradeLog.filter(
                                            (t) => t.result === "win",
                                        ).length;
                                        const losses = tradeLog.filter(
                                            (t) => t.result === "loss",
                                        ).length;
                                        const color =
                                            totPnl >= 0
                                                ? "text-emerald-400"
                                                : "text-red-400";
                                        return (
                                            <tfoot>
                                                <tr className="border-t-2 border-slate-600/60 bg-white/[0.02]">
                                                    <td
                                                        className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                                        colSpan={2}
                                                    >
                                                        Total
                                                    </td>
                                                    <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-200">
                                                        {totContracts || "—"}
                                                    </td>
                                                    <td
                                                        className="px-4 py-2.5"
                                                        colSpan={6}
                                                    />
                                                    <td
                                                        className={`px-4 py-2.5 tabular-nums font-semibold ${color}`}
                                                    >
                                                        {fmt$(totPnl)}
                                                    </td>
                                                    <td className="px-4 py-2.5" />
                                                    <td className="px-4 py-2.5 text-xs text-slate-400">
                                                        <span className="text-emerald-400">
                                                            {wins}W
                                                        </span>{" "}
                                                        /{" "}
                                                        <span className="text-red-400">
                                                            {losses}L
                                                        </span>
                                                    </td>
                                                    {!demoMode && <td />}
                                                </tr>
                                            </tfoot>
                                        );
                                    })()}
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Wheel delete / send-to-log modal */}
            {wheelLogModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-sm">
                                Remove — {wheelLogModal.position.ticker}{" "}
                                {wheelLogModal.position.type}
                            </span>
                            <button
                                onClick={() => setWheelLogModal(null)}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Pre-filled summary */}
                        <div className="bg-slate-900/50 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-0.5">
                            <div className="flex justify-between">
                                <span>Strike</span>
                                <span className="text-slate-200">
                                    ${wheelLogModal.position.strike}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Contracts</span>
                                <span className="text-slate-200">
                                    {wheelLogModal.position.contracts}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Avg Price</span>
                                <span className="text-slate-200">
                                    ${wheelLogModal.position.premium}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Entry</span>
                                <span className="text-slate-200">
                                    {wheelLogModal.position.entry || "—"}
                                </span>
                            </div>
                        </div>

                        {/* Extra fields for log */}
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    label: "Exit Date",
                                    key: "exit",
                                    type: "date",
                                },
                                {
                                    label: "Close Price",
                                    key: "closePrice",
                                    type: "number",
                                    placeholder: "0.01",
                                },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={wheelLogModal.logForm[key]}
                                        onChange={(e) =>
                                            setWheelLogModal((m) => ({
                                                ...m,
                                                logForm: {
                                                    ...m.logForm,
                                                    [key]: e.target.value,
                                                },
                                            }))
                                        }
                                        placeholder={placeholder}
                                        className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => confirmDeleteWheel(false)}
                                className="flex-1 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 bg-red-500/10 ring-1 ring-red-500/20 transition-colors"
                            >
                                Just Delete
                            </button>
                            <button
                                onClick={() => confirmDeleteWheel(true)}
                                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                                Send to Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock delete / send-to-log modal */}
            {stockLogModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-sm">
                                Remove — {stockLogModal.position.ticker}
                            </span>
                            <button
                                onClick={() => setStockLogModal(null)}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Pre-filled summary */}
                        <div className="bg-slate-900/50 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-0.5">
                            <div className="flex justify-between">
                                <span>Shares</span>
                                <span className="text-slate-200">
                                    {stockLogModal.position.shares.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Entry Price</span>
                                <span className="text-slate-200">
                                    ${stockLogModal.position.entryPrice}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    label: "Exit Date",
                                    key: "exit",
                                    type: "date",
                                },
                                {
                                    label: "Close Price",
                                    key: "closePrice",
                                    type: "number",
                                    placeholder: "0.00",
                                },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={stockLogModal.logForm[key]}
                                        onChange={(e) =>
                                            setStockLogModal((m) => ({
                                                ...m,
                                                logForm: {
                                                    ...m.logForm,
                                                    [key]: e.target.value,
                                                },
                                            }))
                                        }
                                        placeholder={placeholder}
                                        className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => confirmDeleteStock(false)}
                                className="flex-1 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 bg-red-500/10 ring-1 ring-red-500/20 transition-colors"
                            >
                                Just Delete
                            </button>
                            <button
                                onClick={() => confirmDeleteStock(true)}
                                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                                Send to Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Wheel position add/edit modal */}
            {wheelForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-md p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-sm">
                                {editWheelId
                                    ? "Edit Wheel Position"
                                    : "Add Wheel Position"}
                            </span>
                            <button
                                onClick={() => {
                                    setWheelForm(null);
                                    setEditWheelId(null);
                                }}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    label: "Ticker",
                                    key: "ticker",
                                    type: "text",
                                    placeholder: "SOFI",
                                },
                                {
                                    label: "Strike",
                                    key: "strike",
                                    type: "number",
                                    placeholder: "14.50",
                                },
                                {
                                    label: "Premium (per share)",
                                    key: "premium",
                                    type: "number",
                                    placeholder: "0.13",
                                },
                                {
                                    label: "Contracts",
                                    key: "contracts",
                                    type: "number",
                                    placeholder: "5",
                                },
                                {
                                    label: "Entry Date",
                                    key: "entry",
                                    type: "date",
                                },
                                {
                                    label: "Expiry Date",
                                    key: "expiry",
                                    type: "date",
                                },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={wheelForm[key]}
                                        onChange={(e) =>
                                            setWheelForm((f) => ({
                                                ...f,
                                                [key]: e.target.value,
                                            }))
                                        }
                                        placeholder={placeholder}
                                        className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                    Type
                                </label>
                                <select
                                    value={wheelForm.type}
                                    onChange={(e) =>
                                        setWheelForm((f) => ({
                                            ...f,
                                            type: e.target.value,
                                        }))
                                    }
                                    className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {["CSP", "CC", "PUT", "CALL"].map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                Notes <span className="text-slate-600 normal-case font-normal tracking-normal">(optional)</span>
                            </label>
                            <textarea
                                rows={2}
                                value={wheelForm.notes}
                                onChange={(e) => setWheelForm((f) => ({ ...f, notes: e.target.value }))}
                                placeholder="Thesis, target, risk notes…"
                                className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                onClick={() => {
                                    setWheelForm(null);
                                    setEditWheelId(null);
                                }}
                                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveWheel}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock position add/edit modal */}
            {stockForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-sm">
                                {editStockId
                                    ? "Edit Stock Position"
                                    : "Add Stock Position"}
                            </span>
                            <button
                                onClick={() => {
                                    setStockForm(null);
                                    setEditStockId(null);
                                }}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    label: "Ticker",
                                    key: "ticker",
                                    type: "text",
                                    placeholder: "PLTR",
                                },
                                {
                                    label: "Shares",
                                    key: "shares",
                                    type: "number",
                                    placeholder: "200",
                                },
                                {
                                    label: "Entry Price",
                                    key: "entryPrice",
                                    type: "number",
                                    placeholder: "71.50",
                                },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={stockForm[key]}
                                        onChange={(e) =>
                                            setStockForm((f) => ({
                                                ...f,
                                                [key]: e.target.value,
                                            }))
                                        }
                                        placeholder={placeholder}
                                        className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                Notes <span className="text-slate-600 normal-case font-normal tracking-normal">(optional)</span>
                            </label>
                            <textarea
                                rows={2}
                                value={stockForm.notes}
                                onChange={(e) => setStockForm((f) => ({ ...f, notes: e.target.value }))}
                                placeholder="Thesis, target, risk notes…"
                                className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                onClick={() => {
                                    setStockForm(null);
                                    setEditStockId(null);
                                }}
                                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveStock}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trade add/edit modal */}
            {tradeForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl ring-1 ring-white/[0.06] w-full max-w-lg p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-sm">
                                {editTradeId !== null
                                    ? "Edit Trade"
                                    : "Add Trade"}
                            </span>
                            <button
                                onClick={() => {
                                    setTradeForm(null);
                                    setEditTradeId(null);
                                }}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    label: "Ticker",
                                    key: "ticker",
                                    type: "text",
                                    placeholder: "SOFI",
                                },
                                {
                                    label: "Strike",
                                    key: "strike",
                                    type: "number",
                                    placeholder: "14.50",
                                },
                                {
                                    label: "Contracts",
                                    key: "contracts",
                                    type: "number",
                                    placeholder: "5",
                                },
                                {
                                    label: "Avg Price",
                                    key: "avgPrice",
                                    type: "number",
                                    placeholder: "0.13",
                                },
                                {
                                    label: "Close Price",
                                    key: "closePrice",
                                    type: "number",
                                    placeholder: "0.01",
                                },
                                {
                                    label: "Entry Date",
                                    key: "entry",
                                    type: "date",
                                },
                                {
                                    label: "Exit Date",
                                    key: "exit",
                                    type: "date",
                                },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                        {label}
                                    </label>
                                    <input
                                        type={type}
                                        value={tradeForm[key]}
                                        onChange={(e) =>
                                            setTradeForm((f) => ({
                                                ...f,
                                                [key]: e.target.value,
                                            }))
                                        }
                                        placeholder={placeholder}
                                        className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                                    Strategy
                                </label>
                                <select
                                    value={tradeForm.strategy}
                                    onChange={(e) =>
                                        setTradeForm((f) => ({
                                            ...f,
                                            strategy: e.target.value,
                                        }))
                                    }
                                    className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {[
                                        "CSP",
                                        "CC",
                                        "PUT",
                                        "CALL",
                                        "Strangle",
                                        "Iron Condor",
                                        "Stock",
                                        "Other",
                                    ].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                onClick={() => {
                                    setTradeForm(null);
                                    setEditTradeId(null);
                                }}
                                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveTrade}
                                className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === "statistics" &&
                tradeLog.length > 0 &&
                (() => {
                    // Pre-compute per-trade stats
                    const trades = tradeLog.map((t) => {
                        const dur = daysBetween(t.entry, t.exit);
                        const cap = tradeCapital(t);
                        const ann =
                            cap > 0 && dur
                                ? (t.pnl / cap) * (365 / dur) * 100
                                : null;
                        return { ...t, dur, ann };
                    });

                    const wins = trades.filter((t) => t.result === "win");
                    const losses = trades.filter((t) => t.result === "loss");
                    const totalWinAmt = wins.reduce((s, t) => s + t.pnl, 0);
                    const totalLossAmt = Math.abs(
                        losses.reduce((s, t) => s + t.pnl, 0),
                    );
                    const profitFactor =
                        totalLossAmt > 0 ? totalWinAmt / totalLossAmt : null;
                    const avgWin = wins.length
                        ? totalWinAmt / wins.length
                        : null;
                    const avgLoss = losses.length
                        ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length
                        : null;
                    const bestTrade = trades.reduce(
                        (b, t) => (t.pnl > b.pnl ? t : b),
                        trades[0],
                    );
                    const worstTrade = trades.reduce(
                        (b, t) => (t.pnl < b.pnl ? t : b),
                        trades[0],
                    );
                    const avgDur = Math.round(
                        trades.reduce((s, t) => s + t.dur, 0) / trades.length,
                    );
                    // Current streak
                    const sorted = [...trades].sort(
                        (a, b) => new Date(b.exit) - new Date(a.exit),
                    );
                    let streak = 0;
                    const streakType = sorted[0]?.result;
                    for (const t of sorted) {
                        if (t.result === streakType) streak++;
                        else break;
                    }

                    // DTE buckets
                    const buckets = [
                        { label: "0–7 DTE", min: 0, max: 7 },
                        { label: "8–14 DTE", min: 8, max: 14 },
                        { label: "15–21 DTE", min: 15, max: 21 },
                        { label: "22+ DTE", min: 22, max: Infinity },
                    ];
                    const dteBuckets = buckets
                        .map((b) => {
                            const group = trades.filter(
                                (t) => t.dur >= b.min && t.dur <= b.max,
                            );
                            const gWins = group.filter(
                                (t) => t.result === "win",
                            );
                            const anns = group
                                .filter((t) => t.ann != null)
                                .map((t) => t.ann);
                            return {
                                label: b.label,
                                count: group.length,
                                winRate: group.length
                                    ? (gWins.length / group.length) * 100
                                    : null,
                                avgPnl: group.length
                                    ? group.reduce((s, t) => s + t.pnl, 0) /
                                      group.length
                                    : null,
                                totalPnl: group.reduce((s, t) => s + t.pnl, 0),
                                avgAnn: anns.length
                                    ? anns.reduce((a, b) => a + b, 0) /
                                      anns.length
                                    : null,
                            };
                        })
                        .filter((b) => b.count > 0);

                    // Per-strategy
                    const strategies = [
                        ...new Set(trades.map((t) => t.strategy)),
                    ];
                    const stratStats = strategies.map((s) => {
                        const group = trades.filter((t) => t.strategy === s);
                        const gWins = group.filter((t) => t.result === "win");
                        const anns = group
                            .filter((t) => t.ann != null)
                            .map((t) => t.ann);
                        return {
                            strategy: s,
                            count: group.length,
                            winRate: group.length
                                ? (gWins.length / group.length) * 100
                                : null,
                            avgPnl: group.length
                                ? group.reduce((s2, t) => s2 + t.pnl, 0) /
                                  group.length
                                : null,
                            totalPnl: group.reduce((s2, t) => s2 + t.pnl, 0),
                            avgAnn: anns.length
                                ? anns.reduce((a, b) => a + b, 0) / anns.length
                                : null,
                        };
                    });

                    // Per-ticker
                    const tickers = [...new Set(trades.map((t) => t.ticker))];
                    const tickerStats = tickers
                        .map((tk) => {
                            const group = trades.filter((t) => t.ticker === tk);
                            const gWins = group.filter(
                                (t) => t.result === "win",
                            );
                            const best = group.reduce(
                                (b, t) => (t.pnl > b.pnl ? t : b),
                                group[0],
                            );
                            const worst = group.reduce(
                                (b, t) => (t.pnl < b.pnl ? t : b),
                                group[0],
                            );
                            return {
                                ticker: tk,
                                count: group.length,
                                winRate: group.length
                                    ? (gWins.length / group.length) * 100
                                    : null,
                                avgPnl: group.length
                                    ? group.reduce((s, t) => s + t.pnl, 0) /
                                      group.length
                                    : null,
                                totalPnl: group.reduce((s, t) => s + t.pnl, 0),
                                bestPnl: best.pnl,
                                worstPnl: worst.pnl,
                            };
                        })
                        .sort((a, b) => b.totalPnl - a.totalPnl);

                    // Monthly P&L
                    const monthMap = {};
                    trades.forEach((t) => {
                        const m = t.exit.slice(0, 7); // "YYYY-MM"
                        if (!monthMap[m])
                            monthMap[m] = { pnl: 0, wins: 0, count: 0 };
                        monthMap[m].pnl += t.pnl;
                        monthMap[m].count++;
                        if (t.result === "win") monthMap[m].wins++;
                    });
                    const monthStats = Object.entries(monthMap)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([month, v]) => ({
                            month,
                            label: new Date(month + "-15").toLocaleDateString(
                                "en-US",
                                { month: "short", year: "numeric" },
                            ),
                            pnl: v.pnl,
                            winRate: (v.wins / v.count) * 100,
                            count: v.count,
                        }));

                    const CARD =
                        "bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-5";
                    const TH =
                        "text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500";
                    const TD = "px-4 py-3 text-sm";
                    const winPct = (n) =>
                        n == null ? "—" : `${n.toFixed(0)}%`;
                    const toggleChart = (key) =>
                        setChartMode((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                        }));
                    const isChart = (key) => !!chartMode[key];

                    const ViewToggle = ({ id }) => (
                        <button
                            onClick={() => toggleChart(id)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ring-1 transition-colors ${
                                isChart(id)
                                    ? "bg-blue-500/20 text-blue-300 ring-blue-500/30"
                                    : "bg-white/[0.05] text-slate-400 ring-white/10 hover:text-slate-200"
                            }`}
                        >
                            {isChart(id) ? "Table" : "Chart"}
                        </button>
                    );

                    const chartTooltipStyle = {
                        backgroundColor: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        fontSize: 12,
                    };

                    return (
                        <div className="space-y-4 mt-4">
                            {/* Summary metrics row */}
                            <div className={CARD}>
                                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 mb-4">
                                    Performance Statistics
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                    {[
                                        {
                                            label: "Profit Factor",
                                            value:
                                                profitFactor != null
                                                    ? profitFactor.toFixed(2)
                                                    : "—",
                                            color:
                                                profitFactor != null &&
                                                profitFactor >= 1.5
                                                    ? "text-emerald-400"
                                                    : profitFactor != null &&
                                                        profitFactor >= 1
                                                      ? "text-yellow-400"
                                                      : "text-red-400",
                                        },
                                        {
                                            label: "Avg Win",
                                            value:
                                                avgWin != null
                                                    ? fmt$(avgWin)
                                                    : "—",
                                            color: "text-emerald-400",
                                        },
                                        {
                                            label: "Avg Loss",
                                            value:
                                                avgLoss != null
                                                    ? fmt$(avgLoss)
                                                    : "—",
                                            color: "text-red-400",
                                        },
                                        {
                                            label: "Reward/Risk",
                                            value:
                                                avgWin != null &&
                                                avgLoss != null &&
                                                avgLoss !== 0
                                                    ? (
                                                          avgWin /
                                                          Math.abs(avgLoss)
                                                      ).toFixed(2)
                                                    : "—",
                                            color: "text-blue-400",
                                        },
                                        {
                                            label: "Best Trade",
                                            value: fmt$(bestTrade.pnl),
                                            sub: bestTrade.ticker,
                                            color:
                                                bestTrade.pnl >= 0
                                                    ? "text-emerald-400"
                                                    : "text-red-400",
                                        },
                                        {
                                            label: "Worst Trade",
                                            value:
                                                losses.length > 0
                                                    ? fmt$(worstTrade.pnl)
                                                    : "—",
                                            sub:
                                                losses.length > 0
                                                    ? worstTrade.ticker
                                                    : "No losses",
                                            color:
                                                worstTrade.pnl >= 0
                                                    ? "text-emerald-400"
                                                    : "text-red-400",
                                        },
                                        {
                                            label: "Avg Duration",
                                            value: `${avgDur}d`,
                                            color: "text-slate-300",
                                        },
                                        {
                                            label: "Current Streak",
                                            value: `${streak}W ${streakType === "win" ? "🔥" : streakType === "loss" ? "❄" : ""}`,
                                            color:
                                                streakType === "win"
                                                    ? "text-emerald-400"
                                                    : "text-red-400",
                                        },
                                    ].map(({ label, value, sub, color }) => (
                                        <div key={label}>
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                                {label}
                                            </div>
                                            <div
                                                className={`text-lg font-bold tabular-nums ${color}`}
                                            >
                                                {value}
                                            </div>
                                            {sub && (
                                                <div className="text-[11px] text-slate-500">
                                                    {sub}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* DTE Bucket breakdown */}
                                <div className={CARD}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            By DTE Bucket
                                        </h2>
                                        <ViewToggle id="dte" />
                                    </div>
                                    {isChart("dte") ? (
                                        <ResponsiveContainer
                                            width="100%"
                                            height={200}
                                        >
                                            <BarChart
                                                data={dteBuckets}
                                                margin={{
                                                    top: 4,
                                                    right: 4,
                                                    left: 0,
                                                    bottom: 0,
                                                }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="rgba(255,255,255,0.05)"
                                                />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{
                                                        fill: "#94a3b8",
                                                        fontSize: 11,
                                                    }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    tick={{
                                                        fill: "#64748b",
                                                        fontSize: 10,
                                                    }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={45}
                                                    tickFormatter={(v) =>
                                                        `$${v}`
                                                    }
                                                />
                                                <Tooltip
                                                    contentStyle={
                                                        chartTooltipStyle
                                                    }
                                                    formatter={(v, n) => [
                                                        n === "avgAnn"
                                                            ? fmtAnn(v)
                                                            : fmt$(v),
                                                        n === "totalPnl"
                                                            ? "Total P&L"
                                                            : n === "avgPnl"
                                                              ? "Avg P&L"
                                                              : "Avg Ann%",
                                                    ]}
                                                />
                                                <ReferenceLine
                                                    y={0}
                                                    stroke="rgba(255,255,255,0.1)"
                                                />
                                                <Bar
                                                    dataKey="totalPnl"
                                                    radius={[4, 4, 0, 0]}
                                                >
                                                    {dteBuckets.map((b, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={
                                                                b.totalPnl >= 0
                                                                    ? "#34d399"
                                                                    : "#f87171"
                                                            }
                                                            fillOpacity={0.8}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.05]">
                                                    {[
                                                        "Bucket",
                                                        "Trades",
                                                        "Win%",
                                                        "Avg P&L",
                                                        "Total P&L",
                                                        "Avg Ann%",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={TH}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dteBuckets.map((b) => (
                                                    <tr
                                                        key={b.label}
                                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                                    >
                                                        <td
                                                            className={`${TD} font-semibold text-slate-200`}
                                                        >
                                                            {b.label}
                                                        </td>
                                                        <td
                                                            className={`${TD} text-slate-400`}
                                                        >
                                                            {b.count}
                                                        </td>
                                                        <td
                                                            className={`${TD} ${b.winRate >= 70 ? "text-emerald-400" : b.winRate >= 50 ? "text-yellow-400" : "text-red-400"}`}
                                                        >
                                                            {winPct(b.winRate)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums ${b.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(b.avgPnl)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums font-semibold ${b.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(b.totalPnl)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums ${b.avgAnn >= 0 ? "text-blue-400" : "text-red-400"}`}
                                                        >
                                                            {b.avgAnn != null
                                                                ? fmtAnn(
                                                                      b.avgAnn,
                                                                  )
                                                                : "—"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Per-strategy */}
                                <div className={CARD}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                            By Strategy
                                        </h2>
                                        <ViewToggle id="strategy" />
                                    </div>
                                    {isChart("strategy") ? (
                                        <ResponsiveContainer
                                            width="100%"
                                            height={200}
                                        >
                                            <BarChart
                                                data={stratStats}
                                                margin={{
                                                    top: 4,
                                                    right: 4,
                                                    left: 0,
                                                    bottom: 0,
                                                }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="rgba(255,255,255,0.05)"
                                                />
                                                <XAxis
                                                    dataKey="strategy"
                                                    tick={{
                                                        fill: "#94a3b8",
                                                        fontSize: 11,
                                                    }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    tick={{
                                                        fill: "#64748b",
                                                        fontSize: 10,
                                                    }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={45}
                                                    tickFormatter={(v) =>
                                                        `$${v}`
                                                    }
                                                />
                                                <Tooltip
                                                    contentStyle={
                                                        chartTooltipStyle
                                                    }
                                                    formatter={(v, n) => [
                                                        n === "avgAnn"
                                                            ? fmtAnn(v)
                                                            : fmt$(v),
                                                        n === "totalPnl"
                                                            ? "Total P&L"
                                                            : "Avg P&L",
                                                    ]}
                                                />
                                                <ReferenceLine
                                                    y={0}
                                                    stroke="rgba(255,255,255,0.1)"
                                                />
                                                <Bar
                                                    dataKey="totalPnl"
                                                    name="Total P&L"
                                                    radius={[4, 4, 0, 0]}
                                                >
                                                    {stratStats.map((s, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={
                                                                s.totalPnl >= 0
                                                                    ? "#34d399"
                                                                    : "#f87171"
                                                            }
                                                            fillOpacity={0.8}
                                                        />
                                                    ))}
                                                </Bar>
                                                <Bar
                                                    dataKey="avgPnl"
                                                    name="Avg P&L"
                                                    radius={[4, 4, 0, 0]}
                                                >
                                                    {stratStats.map((s, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={
                                                                s.avgPnl >= 0
                                                                    ? "#60a5fa"
                                                                    : "#f87171"
                                                            }
                                                            fillOpacity={0.6}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.05]">
                                                    {[
                                                        "Strategy",
                                                        "Trades",
                                                        "Win%",
                                                        "Avg P&L",
                                                        "Total P&L",
                                                        "Avg Ann%",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={TH}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stratStats.map((s) => (
                                                    <tr
                                                        key={s.strategy}
                                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                                    >
                                                        <td
                                                            className={`${TD} font-bold text-slate-100`}
                                                        >
                                                            {s.strategy}
                                                        </td>
                                                        <td
                                                            className={`${TD} text-slate-400`}
                                                        >
                                                            {s.count}
                                                        </td>
                                                        <td
                                                            className={`${TD} ${s.winRate >= 70 ? "text-emerald-400" : s.winRate >= 50 ? "text-yellow-400" : "text-red-400"}`}
                                                        >
                                                            {winPct(s.winRate)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums ${s.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(s.avgPnl)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums font-semibold ${s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(s.totalPnl)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums ${s.avgAnn >= 0 ? "text-blue-400" : "text-red-400"}`}
                                                        >
                                                            {s.avgAnn != null
                                                                ? fmtAnn(
                                                                      s.avgAnn,
                                                                  )
                                                                : "—"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* Per-ticker */}
                            <div className={CARD}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        By Ticker
                                    </h2>
                                    <ViewToggle id="ticker" />
                                </div>
                                {isChart("ticker") ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
                                        <BarChart
                                            data={tickerStats}
                                            margin={{
                                                top: 4,
                                                right: 4,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.05)"
                                            />
                                            <XAxis
                                                dataKey="ticker"
                                                tick={{
                                                    fill: "#94a3b8",
                                                    fontSize: 11,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={45}
                                                tickFormatter={(v) => `$${v}`}
                                            />
                                            <Tooltip
                                                contentStyle={chartTooltipStyle}
                                                formatter={(v, n) => [
                                                    fmt$(v),
                                                    n === "totalPnl"
                                                        ? "Total P&L"
                                                        : "Avg P&L",
                                                ]}
                                            />
                                            <ReferenceLine
                                                y={0}
                                                stroke="rgba(255,255,255,0.1)"
                                            />
                                            <Bar
                                                dataKey="totalPnl"
                                                name="Total P&L"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {tickerStats.map((tk, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={
                                                            tk.totalPnl >= 0
                                                                ? "#34d399"
                                                                : "#f87171"
                                                        }
                                                        fillOpacity={0.8}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.05]">
                                                    {[
                                                        "Ticker",
                                                        "Trades",
                                                        "Win%",
                                                        "Avg P&L",
                                                        "Total P&L",
                                                        "Best",
                                                        "Worst",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={TH}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tickerStats.map((tk) => (
                                                    <tr
                                                        key={tk.ticker}
                                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                                    >
                                                        <td
                                                            className={`${TD} font-bold text-slate-100`}
                                                        >
                                                            {tk.ticker}
                                                        </td>
                                                        <td
                                                            className={`${TD} text-slate-400`}
                                                        >
                                                            {tk.count}
                                                        </td>
                                                        <td
                                                            className={`${TD} ${tk.winRate >= 70 ? "text-emerald-400" : tk.winRate >= 50 ? "text-yellow-400" : "text-red-400"}`}
                                                        >
                                                            {winPct(tk.winRate)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums ${tk.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(tk.avgPnl)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums font-semibold ${tk.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(tk.totalPnl)}
                                                        </td>
                                                        <td className="px-4 py-3 tabular-nums text-sm text-emerald-400">
                                                            {fmt$(tk.bestPnl)}
                                                        </td>
                                                        <td className="px-4 py-3 tabular-nums text-sm text-red-400">
                                                            {fmt$(tk.worstPnl)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Monthly P&L */}
                            <div className={CARD}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        Monthly P&L
                                    </h2>
                                    <ViewToggle id="monthly" />
                                </div>
                                {isChart("monthly") ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
                                        <BarChart
                                            data={monthStats}
                                            margin={{
                                                top: 4,
                                                right: 4,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.05)"
                                            />
                                            <XAxis
                                                dataKey="label"
                                                tick={{
                                                    fill: "#94a3b8",
                                                    fontSize: 11,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                tick={{
                                                    fill: "#64748b",
                                                    fontSize: 10,
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={50}
                                                tickFormatter={(v) => `$${v}`}
                                            />
                                            <Tooltip
                                                contentStyle={chartTooltipStyle}
                                                formatter={(v) => [
                                                    fmt$(v),
                                                    "P&L",
                                                ]}
                                            />
                                            <ReferenceLine
                                                y={0}
                                                stroke="rgba(255,255,255,0.15)"
                                            />
                                            <Bar
                                                dataKey="pnl"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {monthStats.map((m, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={
                                                            m.pnl >= 0
                                                                ? "#34d399"
                                                                : "#f87171"
                                                        }
                                                        fillOpacity={0.8}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/[0.05]">
                                                    {[
                                                        "Month",
                                                        "Trades",
                                                        "Win%",
                                                        "Total P&L",
                                                    ].map((h) => (
                                                        <th
                                                            key={h}
                                                            className={TH}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {monthStats.map((m) => (
                                                    <tr
                                                        key={m.month}
                                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                                    >
                                                        <td
                                                            className={`${TD} font-semibold text-slate-200`}
                                                        >
                                                            {m.label}
                                                        </td>
                                                        <td
                                                            className={`${TD} text-slate-400`}
                                                        >
                                                            {m.count}
                                                        </td>
                                                        <td
                                                            className={`${TD} ${m.winRate >= 70 ? "text-emerald-400" : m.winRate >= 50 ? "text-yellow-400" : "text-red-400"}`}
                                                        >
                                                            {winPct(m.winRate)}
                                                        </td>
                                                        <td
                                                            className={`${TD} tabular-nums font-semibold ${m.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                                        >
                                                            {fmt$(m.pnl)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

            {tab === "strikes" && <StrikeCalculator />}
            {tab === "screener" && (
                <Screener accountId={accountId} userId={userId} />
            )}
            {tab === "watchlist" && <FundWatchlist userId={userId} />}
            {tab === "debate"    && <DebateBoard userId={userId} displayName={displayName} />}
        </div>
    );
}
