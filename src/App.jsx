import { useState, useEffect, useRef } from "react";
import { useTrades } from "./hooks/useTrades";
import { useInvestments } from "./hooks/useInvestments";
import { useAccounts, accountKey } from "./hooks/useAccounts";
import Dashboard from "./components/Dashboard";
import TradeForm from "./components/TradeForm";
import TradeTable from "./components/TradeTable";
import Charts from "./components/Charts";
import InvestmentDashboard from "./components/investments/InvestmentDashboard";
import InvestmentTable from "./components/investments/InvestmentTable";
import InvestmentCharts from "./components/investments/InvestmentCharts";
import InvestmentForm from "./components/investments/InvestmentForm";
import AnalysisDashboard from "./components/analysis/AnalysisDashboard";
import MattCapital from "./components/fund/MattCapital";
import { FUND_ACCESS_CODE } from "./utils/mattCapitalData";
import {
    Plus,
    BarChart2,
    List,
    FlaskConical,
    TrendingUp,
    LineChart,
    RefreshCw,
    KeyRound,
    X,
    Eye,
    ChevronDown,
    Pencil,
    Trash2,
    Check,
} from "lucide-react";
import TickerTape, { openWatchlistModal } from "./components/TickerTape";
import { SEED_TRADES } from "./utils/seedData";
import { SEED_INVESTMENTS } from "./utils/seedInvestments";
import { fetchAllPrices } from "./utils/fetchPrices";

export default function App() {
    const {
        accounts,
        activeAccount,
        activeId,
        createAccount,
        renameAccount,
        deleteAccount,
        switchTo,
    } = useAccounts();
    const { trades, addTrade, updateTrade, deleteTrade, loadTrades } =
        useTrades(activeId);
    const {
        investments,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        loadInvestments,
    } = useInvestments(activeId);

    const [section, setSection] = useState("investments"); // 'investments' | 'analysis' | 'trading' | 'fund'
    const [fundCode, setFundCode] = useState(() => localStorage.getItem('bt_fund_code') || '')
    const fundUnlocked = fundCode === FUND_ACCESS_CODE
    const [watchlistNav, setWatchlistNav] = useState(null);
    const [view, setView] = useState("trades");
    const [invView, setInvView] = useState("positions");

    const [showForm, setShowForm] = useState(false);
    const [editTrade, setEditTrade] = useState(null);

    const [showInvForm, setShowInvForm] = useState(false);
    const [editInv, setEditInv] = useState(null);
    const [updatePriceInv, setUpdatePriceInv] = useState(null);
    const [newPrice, setNewPrice] = useState("");

    // Cash — per account
    const cashKey = accountKey("bt_cash", activeId);
    const [cash, setCash] = useState(() =>
        parseFloat(localStorage.getItem(cashKey) || "0"),
    );

    // Reload cash when account switches
    useEffect(() => {
        setCash(parseFloat(localStorage.getItem(cashKey) || "0"));
    }, [cashKey]);

    function handleCashUpdate(val) {
        const n = Math.max(0, parseFloat(val) || 0);
        setCash(n);
        localStorage.setItem(cashKey, String(n));
    }

    // Price refresh
    const [refreshing, setRefreshing] = useState(false);
    const [refreshResult, setRefreshResult] = useState(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [finnhubKey, setFinnhubKey] = useState(
        () => localStorage.getItem("bt_finnhub_key") || "",
    );
    const [avKey, setAvKey] = useState(
        () => localStorage.getItem("bt_av_key") || "",
    );

    // Account switcher
    const [showAccounts, setShowAccounts] = useState(false);
    const [renamingId, setRenamingId] = useState(null);
    const [renameVal, setRenameVal] = useState("");
    const [newAccName, setNewAccName] = useState("");
    const [showNewAcc, setShowNewAcc] = useState(false);
    const acctDropRef = useRef(null);

    useEffect(() => {
        if (!showAccounts) return;
        function handle(e) {
            if (acctDropRef.current && !acctDropRef.current.contains(e.target))
                setShowAccounts(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [showAccounts]);

    // ── Trading handlers ──────────────────────────────────────────
    function handleEditTrade(trade) {
        setEditTrade(trade);
        setShowForm(true);
    }
    function handleSaveTrade(form) {
        if (editTrade) {
            updateTrade(editTrade.id, form);
            setEditTrade(null);
        } else addTrade(form);
    }
    function handleCloseTradeForm() {
        setShowForm(false);
        setEditTrade(null);
    }
    function loadDemoData() {
        if (
            trades.length > 0 &&
            !confirm("Replace current trades with demo data?")
        )
            return;
        loadTrades(SEED_TRADES);
    }

    // ── Investment handlers ───────────────────────────────────────
    function handleEditInv(inv) {
        setEditInv(inv);
        setShowInvForm(true);
    }
    function handleSaveInv(form) {
        if (editInv) {
            const prev = editInv;
            updateInvestment(prev.id, form);
            setEditInv(null);
            const prevShares = parseFloat(prev.shares) || 0;
            const prevCost = parseFloat(prev.avgCost) || 0;
            const newShares = parseFloat(form.shares) || 0;
            const newCost = parseFloat(form.avgCost) || 0;
            if (prev.status === "open" && form.status === "closed") {
                handleCashUpdate(
                    cash + prevShares * (parseFloat(form.sellPrice) || 0),
                );
            } else if (prev.status === "open" && form.status === "open") {
                handleCashUpdate(
                    cash - (newShares * newCost - prevShares * prevCost),
                );
            }
        } else {
            addInvestment(form);
            if (form.status === "open") {
                handleCashUpdate(
                    cash -
                        (parseFloat(form.shares) || 0) *
                            (parseFloat(form.avgCost) || 0),
                );
            }
            if (form.status === "closed") {
                const s = parseFloat(form.shares) || 0;
                handleCashUpdate(
                    cash +
                        s *
                            ((parseFloat(form.sellPrice) || 0) -
                                (parseFloat(form.avgCost) || 0)),
                );
            }
        }
    }
    function handleCloseInvForm() {
        setShowInvForm(false);
        setEditInv(null);
    }
    function handleDeleteInv(id) {
        const inv = investments.find((i) => i.id === id);
        if (inv?.status === "open") {
            const shares = parseFloat(inv.shares) || 0;
            const price =
                parseFloat(inv.currentPrice) || parseFloat(inv.avgCost) || 0;
            handleCashUpdate(cash + shares * price);
        }
        deleteInvestment(id);
    }
    function loadDemoInvestments() {
        if (
            investments.length > 0 &&
            !confirm("Replace current positions with demo data?")
        )
            return;
        loadInvestments(SEED_INVESTMENTS);
    }
    function handleUpdatePrice(inv) {
        setUpdatePriceInv(inv);
        setNewPrice(inv.currentPrice || "");
    }
    async function handleRefreshPrices() {
        setRefreshing(true);
        setRefreshResult(null);
        const open = investments.filter((i) => i.status === "open");
        const isCrypto = (sym) =>
            [
                "BTC",
                "ETH",
                "SOL",
                "BNB",
                "XRP",
                "ADA",
                "DOGE",
                "AVAX",
                "DOT",
                "MATIC",
            ].includes(sym?.toUpperCase());
        if (open.some((i) => !isCrypto(i.symbol)) && !finnhubKey) {
            setShowApiKey(true);
            setRefreshing(false);
            return;
        }
        try {
            const { prices, errors } = await fetchAllPrices(
                investments,
                finnhubKey,
            );
            let updated = 0;
            Object.entries(prices).forEach(([sym, price]) => {
                const inv = investments.find(
                    (i) =>
                        i.symbol.toUpperCase() === sym && i.status === "open",
                );
                if (inv) {
                    updateInvestment(inv.id, { currentPrice: String(price) });
                    updated++;
                }
            });
            setRefreshResult({ updated, errors });
        } catch (e) {
            setRefreshResult({ updated: 0, errors: [e.message] });
        }
        setRefreshing(false);
    }
    function saveApiKey(key) {
        setFinnhubKey(key);
        localStorage.setItem("bt_finnhub_key", key);
    }
    function saveAvKey(key) {
        setAvKey(key);
        localStorage.setItem("bt_av_key", key);
    }
    function submitPriceUpdate(e) {
        e.preventDefault();
        if (updatePriceInv)
            updateInvestment(updatePriceInv.id, { currentPrice: newPrice });
        setUpdatePriceInv(null);
        setNewPrice("");
    }

    // ── Account switcher handlers ─────────────────────────────────
    function handleSwitch(id) {
        switchTo(id);
        setShowAccounts(false);
        setRenamingId(null);
    }
    function startRename(id, name) {
        setRenamingId(id);
        setRenameVal(name);
    }
    function commitRename(id) {
        renameAccount(id, renameVal);
        setRenamingId(null);
    }
    function handleCreateAccount() {
        if (!newAccName.trim()) return;
        createAccount(newAccName.trim());
        setNewAccName("");
        setShowNewAcc(false);
        setShowAccounts(false);
    }

    const inputCls =
        "bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500";

    // EF storage keys are per-account
    const efParamsKey = accountKey("bt_ef_params", activeId);
    const efResearchParamsKey = accountKey("bt_ef_research_params", activeId);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden">
            {/* Header */}
            <header className="border-b border-slate-700 bg-slate-800/60 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Top row: logo · account · watchlist · action buttons */}
                    <div className="flex items-center gap-2 py-2 min-h-12">
                        {/* Logo — abbreviated on small screens */}
                        <span className="text-blue-400 font-bold tracking-tight shrink-0">
                            <span className="sm:hidden text-base">BT</span>
                            <span className="hidden sm:inline text-lg">
                                BT Speculation
                            </span>
                        </span>

                        {/* Account switcher */}
                        <div className="relative" ref={acctDropRef}>
                            <button
                                onClick={() => {
                                    setShowAccounts((o) => !o);
                                    setRenamingId(null);
                                    setShowNewAcc(false);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors border border-slate-600/50"
                            >
                                <span className="max-w-[80px] sm:max-w-none truncate">
                                    {activeAccount.name}
                                </span>
                                <ChevronDown
                                    size={11}
                                    className="text-slate-500 shrink-0"
                                />
                            </button>

                            {showAccounts && (
                                <div className="absolute top-full left-0 mt-1.5 w-56 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 pt-2.5 pb-1 font-semibold">
                                        Accounts
                                    </p>
                                    {accounts.map((acc) => (
                                        <div
                                            key={acc.id}
                                            className={`flex items-center gap-1 px-2 py-1.5 group hover:bg-slate-700/50 ${acc.id === activeId ? "bg-slate-700/40" : ""}`}
                                        >
                                            {renamingId === acc.id ? (
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        commitRename(acc.id);
                                                    }}
                                                    className="flex items-center gap-1 flex-1"
                                                >
                                                    <input
                                                        autoFocus
                                                        value={renameVal}
                                                        onChange={(e) =>
                                                            setRenameVal(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="flex-1 bg-slate-700 border border-slate-500 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="text-green-400 hover:text-green-300 p-0.5"
                                                    >
                                                        <Check size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setRenamingId(null)
                                                        }
                                                        className="text-slate-500 hover:text-slate-300 p-0.5"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </form>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleSwitch(acc.id)
                                                        }
                                                        className="flex-1 text-left text-xs flex items-center gap-2"
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.id === activeId ? "bg-blue-400" : "bg-slate-600"}`}
                                                        />
                                                        <span
                                                            className={
                                                                acc.id ===
                                                                activeId
                                                                    ? "text-slate-100 font-semibold"
                                                                    : "text-slate-300"
                                                            }
                                                        >
                                                            {acc.name}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            startRename(
                                                                acc.id,
                                                                acc.name,
                                                            )
                                                        }
                                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5 transition-opacity"
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                    {accounts.length > 1 &&
                                                        acc.id !==
                                                            "default" && (
                                                            <button
                                                                onClick={() => {
                                                                    if (
                                                                        confirm(
                                                                            `Delete "${acc.name}"? All its data will be lost.`,
                                                                        )
                                                                    )
                                                                        deleteAccount(
                                                                            acc.id,
                                                                        );
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 transition-opacity"
                                                            >
                                                                <Trash2
                                                                    size={11}
                                                                />
                                                            </button>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-700 mt-1 p-2">
                                        {showNewAcc ? (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleCreateAccount();
                                                }}
                                                className="flex gap-1"
                                            >
                                                <input
                                                    autoFocus
                                                    value={newAccName}
                                                    onChange={(e) =>
                                                        setNewAccName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Account name…"
                                                    className="flex-1 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                                                />
                                                <button
                                                    type="submit"
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium"
                                                >
                                                    Add
                                                </button>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    setShowNewAcc(true)
                                                }
                                                className="w-full flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 px-1 py-1 rounded hover:bg-slate-700/50 transition-colors"
                                            >
                                                <Plus size={12} /> New account
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Watchlist */}
                        <button
                            onClick={openWatchlistModal}
                            title="Watchlist"
                            className="flex items-center px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                        >
                            <Eye size={14} />
                        </button>

                        {/* Section tabs — pill style, desktop only */}
                        <div className="hidden sm:flex bg-slate-700/60 rounded-lg p-0.5 gap-0.5 ml-1">
                            <button
                                onClick={() => setSection("investments")}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === "investments" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                <TrendingUp size={12} /> Investments
                            </button>
                            <button
                                onClick={() => setSection("analysis")}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === "analysis" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                <LineChart size={12} /> Analyse
                            </button>
                            <button
                                onClick={() => setSection("trading")}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === "trading" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                Day Trading
                            </button>
                            {fundUnlocked && (
                                <button
                                    onClick={() => setSection("fund")}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === "fund" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                >
                                    MATT Capital
                                </button>
                            )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Context action buttons */}
                        <div className="flex items-center gap-1.5">
                            {section === "trading" && (
                                <>
                                    <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                                        <button
                                            onClick={() => setView("trades")}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === "trades" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                        >
                                            <List size={13} />{" "}
                                            <span className="hidden sm:inline">
                                                Trades
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setView("charts")}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === "charts" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                        >
                                            <BarChart2 size={13} />{" "}
                                            <span className="hidden sm:inline">
                                                Charts
                                            </span>
                                        </button>
                                    </div>
                                    {trades.length === 0 && (
                                        <button
                                            onClick={loadDemoData}
                                            className="hidden sm:flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <FlaskConical size={15} /> Demo Data
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="flex items-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Plus size={15} />{" "}
                                        <span className="hidden sm:inline">
                                            Add Trade
                                        </span>
                                    </button>
                                </>
                            )}

                            {section === "analysis" && (
                                <button
                                    onClick={() => setShowApiKey(true)}
                                    title="API Keys"
                                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <KeyRound size={14} />
                                </button>
                            )}

                            {section === "investments" && (
                                <>
                                    <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                                        <button
                                            onClick={() =>
                                                setInvView("positions")
                                            }
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === "positions" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                        >
                                            <List size={13} />{" "}
                                            <span className="hidden sm:inline">
                                                Positions
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setInvView("charts")}
                                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === "charts" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
                                        >
                                            <BarChart2 size={13} />{" "}
                                            <span className="hidden sm:inline">
                                                Charts
                                            </span>
                                        </button>
                                    </div>
                                    {investments.length === 0 && (
                                        <button
                                            onClick={loadDemoInvestments}
                                            className="hidden sm:flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <FlaskConical size={15} /> Demo Data
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowApiKey(true)}
                                        title="Finnhub API key"
                                        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <KeyRound size={14} />
                                    </button>
                                    <button
                                        onClick={handleRefreshPrices}
                                        disabled={refreshing}
                                        className="flex items-center gap-1 sm:gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <RefreshCw
                                            size={14}
                                            className={
                                                refreshing ? "animate-spin" : ""
                                            }
                                        />
                                        <span className="hidden sm:inline">
                                            {refreshing
                                                ? "Refreshing…"
                                                : "Refresh Prices"}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setShowInvForm(true)}
                                        className="flex items-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Plus size={15} />{" "}
                                        <span className="hidden sm:inline">
                                            Add Position
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Bottom row: section tabs — full width, mobile only */}
                    <div className="sm:hidden flex -mx-4">
                        <button
                            onClick={() => setSection("investments")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                                section === "investments"
                                    ? "border-blue-500 text-blue-400"
                                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                            }`}
                        >
                            <TrendingUp size={12} /> Investments
                        </button>
                        <button
                            onClick={() => setSection("analysis")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                                section === "analysis"
                                    ? "border-blue-500 text-blue-400"
                                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                            }`}
                        >
                            <LineChart size={12} /> Analyse
                        </button>
                        <button
                            onClick={() => setSection("trading")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                                section === "trading"
                                    ? "border-blue-500 text-blue-400"
                                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                            }`}
                        >
                            Day Trading
                        </button>
                        {fundUnlocked && (
                            <button
                                onClick={() => setSection("fund")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                                    section === "fund"
                                        ? "border-blue-500 text-blue-400"
                                        : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                                }`}
                            >
                                MATT Capital
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Ticker tape */}
            <TickerTape
                accountId={activeId}
                onSendTo={(dest, sym) => {
                    setSection("analysis");
                    setWatchlistNav({ dest, sym });
                }}
            />

            {/* Main */}
            <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
                {section === "trading" && (
                    <>
                        <Dashboard trades={trades} />
                        {view === "trades" ? (
                            <TradeTable
                                trades={trades}
                                onDelete={deleteTrade}
                                onEdit={handleEditTrade}
                            />
                        ) : (
                            <Charts trades={trades} />
                        )}
                    </>
                )}

                {section === "investments" && (
                    <>
                        <InvestmentDashboard
                            investments={investments}
                            cash={cash}
                            onCashUpdate={handleCashUpdate}
                        />
                        {invView === "positions" ? (
                            <InvestmentTable
                                investments={investments}
                                onDelete={handleDeleteInv}
                                onEdit={handleEditInv}
                                onUpdatePrice={handleUpdatePrice}
                            />
                        ) : (
                            <InvestmentCharts investments={investments} />
                        )}
                    </>
                )}

                {section === "fund" && <MattCapital />}

                {section === "analysis" && (
                    <AnalysisDashboard
                        investments={investments}
                        cash={cash}
                        watchlistNav={watchlistNav}
                        onWatchlistNavConsumed={() => setWatchlistNav(null)}
                        efParamsKey={efParamsKey}
                        efResearchParamsKey={efResearchParamsKey}
                    />
                )}
            </main>

            {/* Trade Form Modal */}
            {showForm && (
                <TradeForm
                    onAdd={handleSaveTrade}
                    onClose={handleCloseTradeForm}
                    initialTrade={editTrade}
                />
            )}

            {/* Investment Form Modal */}
            {showInvForm && (
                <InvestmentForm
                    onAdd={handleSaveInv}
                    onClose={handleCloseInvForm}
                    initialInv={editInv}
                />
            )}

            {/* API Keys Modal */}
            {showApiKey && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-slate-100">
                                API Keys
                            </h3>
                            <button
                                onClick={() => setShowApiKey(false)}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Finnhub
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Price refresh · Fundamentals · Research —
                                    free at{" "}
                                    <span className="text-blue-400">
                                        finnhub.io
                                    </span>
                                </p>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        saveApiKey(e.target.key.value.trim());
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="key"
                                        type="text"
                                        defaultValue={finnhubKey}
                                        autoFocus
                                        placeholder="Finnhub API key…"
                                        className={`flex-1 ${inputCls} font-mono text-sm`}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium"
                                    >
                                        Save
                                    </button>
                                </form>
                                {finnhubKey && (
                                    <button
                                        onClick={() => {
                                            setFinnhubKey("");
                                            localStorage.removeItem(
                                                "bt_finnhub_key",
                                            );
                                        }}
                                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-slate-700" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Alpha Vantage
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Financial Statements tab — free at{" "}
                                    <span className="text-blue-400">
                                        alphavantage.co
                                    </span>{" "}
                                    · 25 req/day · resets midnight UTC
                                </p>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        saveAvKey(e.target.key.value.trim());
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="key"
                                        type="text"
                                        defaultValue={avKey}
                                        placeholder="Alpha Vantage API key…"
                                        className={`flex-1 ${inputCls} font-mono text-sm`}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium"
                                    >
                                        Save
                                    </button>
                                </form>
                                {avKey && (
                                    <button
                                        onClick={() => {
                                            setAvKey("");
                                            localStorage.removeItem(
                                                "bt_av_key",
                                            );
                                        }}
                                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-slate-700" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Fund Access Code
                                </p>
                                <p className="text-xs text-slate-500 mb-2">
                                    Unlocks the MATT Capital tab
                                </p>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        const val = e.target.code.value.trim()
                                        setFundCode(val)
                                        localStorage.setItem('bt_fund_code', val)
                                    }}
                                    className="flex gap-2"
                                >
                                    <input
                                        name="code"
                                        type="password"
                                        defaultValue={fundCode}
                                        placeholder="Enter access code…"
                                        className={`flex-1 ${inputCls} font-mono text-sm`}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium"
                                    >
                                        Save
                                    </button>
                                </form>
                                {fundCode && (
                                    <button
                                        onClick={() => {
                                            setFundCode('')
                                            localStorage.removeItem('bt_fund_code')
                                        }}
                                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowApiKey(false)}
                            className="mt-5 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Refresh result toast */}
            {refreshResult && (
                <div className="fixed bottom-5 right-5 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3 max-w-sm">
                    <div className="flex-1">
                        {refreshResult.updated > 0 && (
                            <p className="text-sm font-medium text-green-400">
                                ✓ Updated {refreshResult.updated} price
                                {refreshResult.updated !== 1 ? "s" : ""}
                            </p>
                        )}
                        {refreshResult.errors.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                                {refreshResult.errors.map((e, i) => (
                                    <p key={i} className="text-xs text-red-400">
                                        {e}
                                    </p>
                                ))}
                            </div>
                        )}
                        {refreshResult.updated === 0 &&
                            refreshResult.errors.length === 0 && (
                                <p className="text-sm text-slate-400">
                                    No prices updated
                                </p>
                            )}
                    </div>
                    <button
                        onClick={() => setRefreshResult(null)}
                        className="text-slate-500 hover:text-slate-300 shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Quick Price Update Modal */}
            {updatePriceInv && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-5">
                        <h3 className="text-base font-semibold text-slate-100 mb-1">
                            Update Price
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            {updatePriceInv.symbol} — {updatePriceInv.name}
                        </p>
                        <form
                            onSubmit={submitPriceUpdate}
                            className="space-y-3"
                        >
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                autoFocus
                                className={`w-full ${inputCls}`}
                                placeholder="Current price"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                required
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUpdatePriceInv(null)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
