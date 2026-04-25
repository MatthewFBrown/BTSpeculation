import { useState, useEffect, useRef } from "react";
import { Plus, X, RefreshCw, GripVertical, Pencil, Check } from "lucide-react";
import { supabase } from "../../utils/supabase";
import BullBearSection from "./BullBearSection";

// ── Metric fetching ───────────────────────────────────────────
async function fetchSymbolData(symbol, key) {
    const base = "https://finnhub.io/api/v1";
    const [qRes, mRes] = await Promise.all([
        fetch(`${base}/quote?symbol=${symbol}&token=${key}`),
        fetch(`${base}/stock/metric?symbol=${symbol}&metric=all&token=${key}`),
    ]);
    const q = await qRes.json();
    const { metric: m } = await mRes.json();
    return {
        price: q?.c ?? null,
        change: q?.dp ?? null, // daily % change
        pe: m?.peNormalizedAnnual ?? m?.peBasicExclExtraTTM ?? null,
        fpe: m?.forwardPE ?? null,
        eps: m?.epsNormalizedAnnual ?? m?.epsBasicExclExtraTTM ?? null,
        cr: m?.currentRatioQuarterly ?? m?.currentRatioAnnual ?? null,
        beta: m?.beta ?? null,
    };
}

// ── Formatters ────────────────────────────────────────────────
const fmtPrice = (n) => (n == null ? "—" : `$${n.toFixed(2)}`);
const fmtEps = (n) => (n == null ? "—" : `$${n.toFixed(2)}`);
const fmtN = (n) => (n == null ? "—" : n.toFixed(2));

const RANK_COLOR = (i) =>
    i === 0
        ? "text-yellow-400"
        : i === 1
          ? "text-slate-300"
          : i === 2
            ? "text-amber-600"
            : "text-slate-600";

// ── Metric cell ───────────────────────────────────────────────
function Metric({ label, value }) {
    const empty = value === "—";
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 leading-none mb-1 whitespace-nowrap">
                {label}
            </span>
            <span
                className={`text-xs font-semibold tabular-nums leading-none ${empty ? "text-slate-600" : "text-slate-100"}`}
            >
                {value}
            </span>
        </div>
    );
}

// ── Single stock row ──────────────────────────────────────────
function StockRow({
    entry,
    idx,
    isMe,
    data,
    debateCounts,
    voteCounts,
    userId,
    displayName,
    onDelete,
    onNoteUpdate,
    draggable,
    onDragStart,
    onDragEnter,
    onDragEnd,
    onDragOver,
    isDragSource,
    isDragTarget,
}) {
    const [expanded, setExpanded] = useState(false);
    const [editNote, setEditNote] = useState(false);
    const [noteInput, setNoteInput] = useState(entry.note || "");
    const noteRef = useRef(null);
    const didDrag = useRef(false);
    const loading = !data;
    const chgColor =
        data?.change == null
            ? ""
            : data.change >= 0
              ? "text-emerald-400"
              : "text-red-400";
    const hasNote = !!entry.note;

    useEffect(() => {
        if (editNote) noteRef.current?.focus();
    }, [editNote]);

    async function saveNote() {
        const val = noteInput.trim();
        await onNoteUpdate?.(entry.id, val || null);
        setEditNote(false);
    }

    return (
        <div
            draggable={draggable}
            onDragStart={(e) => {
                didDrag.current = true;
                onDragStart?.(e);
            }}
            onDragEnter={onDragEnter}
            onDragEnd={(e) => {
                onDragEnd?.(e);
                setTimeout(() => {
                    didDrag.current = false;
                }, 0);
            }}
            onDragOver={onDragOver}
            className={`group rounded-lg transition-all ${
                isDragSource
                    ? "opacity-40 scale-[0.98]"
                    : isDragTarget
                      ? "ring-1 ring-blue-400/60 bg-blue-500/[0.06]"
                      : "hover:bg-white/[0.04]"
            }`}
        >
            {/* Main row — click to expand, drag handle on left */}
            <div
                className="flex items-center gap-1.5 px-2 py-2.5 cursor-pointer select-none"
                onClick={() => {
                    if (!didDrag.current && data) setExpanded((e) => !e);
                }}
            >
                {isMe ? (
                    <GripVertical
                        size={13}
                        className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0 cursor-grab active:cursor-grabbing"
                    />
                ) : (
                    <span className="w-[13px] shrink-0" />
                )}

                <span
                    className={`text-[11px] font-bold tabular-nums w-4 text-center shrink-0 ${RANK_COLOR(idx)}`}
                >
                    {idx + 1}
                </span>

                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100">
                        {entry.symbol}
                    </span>
                    {/* Note indicator dot */}
                    {hasNote && !expanded && (
                        <span
                            className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0"
                            title={entry.note}
                        />
                    )}
                </div>

                {/* Vote + debate indicators */}
                {!expanded && (() => {
                    const vc = voteCounts[entry.symbol]
                    const dc = debateCounts[entry.symbol]
                    const hasVotes = vc && (vc.bull > 0 || vc.bear > 0)
                    const hasArgs  = dc && (dc.bull > 0 || dc.bear > 0)
                    if (!hasVotes && !hasArgs) return null
                    return (
                        <div className="flex items-center gap-1 shrink-0">
                            {hasVotes && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-700/60 ring-1 ring-white/[0.08] text-[10px] font-bold tabular-nums">
                                    {vc.bull > 0 && <span className="text-emerald-400">🟢{vc.bull}</span>}
                                    {vc.bull > 0 && vc.bear > 0 && <span className="text-slate-600 mx-0.5">·</span>}
                                    {vc.bear > 0 && <span className="text-red-400">🔴{vc.bear}</span>}
                                </div>
                            )}
                            {hasArgs && (
                                <span className="text-[10px] text-slate-600 tabular-nums">
                                    {dc.bull > 0 && <span className="text-emerald-700">{dc.bull}▲</span>}
                                    {dc.bull > 0 && dc.bear > 0 && <span> </span>}
                                    {dc.bear > 0 && <span className="text-red-700">{dc.bear}▼</span>}
                                </span>
                            )}
                        </div>
                    )
                })()}

                {loading ? (
                    <span className="text-[11px] text-slate-600 animate-pulse">
                        …
                    </span>
                ) : (
                    <div className="text-right shrink-0">
                        <span className="text-sm font-semibold tabular-nums text-slate-200">
                            {fmtPrice(data.price)}
                        </span>
                        {data.change != null && (
                            <span
                                className={`ml-1.5 text-[10px] font-medium tabular-nums ${chgColor}`}
                            >
                                {data.change >= 0 ? "+" : ""}
                                {data.change.toFixed(2)}%
                            </span>
                        )}
                    </div>
                )}

                {isMe && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(entry.id);
                        }}
                        className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 shrink-0"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* Expanded: metrics + note */}
            {expanded && data && (
                <div className="px-3 pb-2.5 space-y-2">
                    <div className="grid grid-cols-5 gap-x-3 gap-y-2 bg-slate-900/50 ring-1 ring-white/[0.05] rounded-lg px-3 py-2.5">
                        <Metric label="PE" value={data.pe?.toFixed(1)} />
                        <Metric label="fPE" value={data.fpe?.toFixed(1)} />
                        <Metric label="EPS" value={fmtEps(data.eps)} />
                        <Metric label="CR" value={fmtN(data.cr)} />
                        <Metric label="Beta" value={fmtN(data.beta)} />
                    </div>

                    {/* Note section */}
                    {isMe ? (
                        editNote ? (
                            <div className="flex gap-1.5">
                                <input
                                    ref={noteRef}
                                    value={noteInput}
                                    onChange={(e) =>
                                        setNoteInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") saveNote();
                                        if (e.key === "Escape")
                                            setEditNote(false);
                                    }}
                                    placeholder="Add a note…"
                                    className="flex-1 bg-slate-900/60 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                                />
                                <button
                                    onClick={saveNote}
                                    className="text-emerald-400 hover:text-emerald-300 px-1"
                                >
                                    <Check size={12} />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditNote(false);
                                        setNoteInput(entry.note || "");
                                    }}
                                    className="text-slate-500 hover:text-slate-300 px-1"
                                >
                                    <X size={11} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setEditNote(true)}
                                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                            >
                                <Pencil size={10} />
                                {entry.note || (
                                    <span className="italic text-slate-600">
                                        Add a note…
                                    </span>
                                )}
                            </button>
                        )
                    ) : (
                        entry.note && (
                            <p className="text-[11px] text-slate-500">
                                {entry.note}
                            </p>
                        )
                    )}
                    <BullBearSection symbol={entry.symbol} userId={userId} displayName={displayName} />
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function FundWatchlist({ userId }) {
    const [entries,      setEntries]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [metrics,      setMetrics]      = useState({}); // { [symbol]: data }
    const [debateCounts, setDebateCounts] = useState({}); // { [symbol]: { bull, bear } }
    const [voteCounts,   setVoteCounts]   = useState({}); // { [symbol]: { bull, bear } }
    const [addSymbol,    setAddSymbol]    = useState("");
    const [addNote,      setAddNote]      = useState("");
    const [myName,       setMyName]       = useState(""); // display name stored in DB rows
    const [dragFrom,     setDragFrom]     = useState(null);
    const [dragTo,       setDragTo]       = useState(null);
    const [mobileTab,    setMobileTab]    = useState(userId);
    const fetched = useRef(new Set());
    const symRef  = useRef(null);

    // Reset mobile tab to own column when userId changes
    useEffect(() => {
        setMobileTab(userId);
    }, [userId]);

    // ── Debate counts — load + keep live ─────────────────────
    useEffect(() => {
        function buildCounts(data) {
            const counts = {}
            ;(data || []).forEach(a => {
                if (!counts[a.symbol]) counts[a.symbol] = { bull: 0, bear: 0 }
                counts[a.symbol][a.stance]++
            })
            return counts
        }

        supabase.from('fund_bull_bear_args').select('symbol, stance, parent_id').is('parent_id', null)
            .then(({ data }) => setDebateCounts(buildCounts(data)))

        // Real-time: recompute full counts on any change (simple + correct)
        const ch = supabase.channel('debate_counts_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_args' },
                () => {
                    supabase.from('fund_bull_bear_args').select('symbol, stance, parent_id').is('parent_id', null)
                        .then(({ data }) => setDebateCounts(buildCounts(data)))
                }
            ).subscribe()

        return () => supabase.removeChannel(ch)
    }, [])

    // ── Vote counts — load + keep live ───────────────────────
    useEffect(() => {
        function buildVotes(data) {
            const counts = {}
            ;(data || []).forEach(v => {
                if (!counts[v.symbol]) counts[v.symbol] = { bull: 0, bear: 0 }
                counts[v.symbol][v.vote]++
            })
            return counts
        }

        supabase.from('fund_bull_bear_votes').select('symbol, vote')
            .then(({ data }) => setVoteCounts(buildVotes(data)))

        const ch = supabase.channel('vote_counts_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_votes' },
                () => {
                    supabase.from('fund_bull_bear_votes').select('symbol, vote')
                        .then(({ data }) => setVoteCounts(buildVotes(data)))
                }
            ).subscribe()

        return () => supabase.removeChannel(ch)
    }, [])

    // ── Boot: load rows + get display name from auth ──────────
    useEffect(() => {
        load();

        // Real-time updates
        const ch = supabase
            .channel("fund_watchlist_rt")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fund_watchlist" },
                ({ eventType, new: n, old: o }) => {
                    if (eventType === "INSERT")
                        setEntries((prev) => [...prev, n]);
                    if (eventType === "DELETE")
                        setEntries((prev) => prev.filter((e) => e.id !== o.id));
                    if (eventType === "UPDATE")
                        setEntries((prev) =>
                            prev.map((e) => (e.id === n.id ? n : e)),
                        );
                },
            )
            .subscribe();
        return () => supabase.removeChannel(ch);
    }, []);

    // ── Fetch metrics for any new symbols ─────────────────────
    useEffect(() => {
        const key = localStorage.getItem("bt_finnhub_key");
        if (!key) return;
        const symbols = [...new Set(entries.map((e) => e.symbol))];
        symbols
            .filter((s) => !fetched.current.has(s))
            .forEach(async (sym) => {
                fetched.current.add(sym);
                try {
                    const data = await fetchSymbolData(sym, key);
                    setMetrics((prev) => ({ ...prev, [sym]: data }));
                } catch {
                    fetched.current.delete(sym);
                }
            });
    }, [entries]);

    // Sync local myName from entries when they load
    useEffect(() => {
        const myRows = entries.filter((e) => e.user_id === userId);
        if (myRows.length > 0 && myRows[0].display_name) {
            setMyName(myRows[0].display_name);
        }
    }, [entries, userId]);

    // Auto-seed display name from Supabase auth if not set
    useEffect(() => {
        if (myName) return;
        supabase.auth.getUser().then(({ data: { user } }) => {
            const name =
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                user?.email?.split("@")[0] ||
                "";
            if (name) setMyName(name);
        });
    }, [myName]);

    // ── DB helpers ─────────────────────────────────────────────
    async function load() {
        setLoading(true);
        const { data } = await supabase
            .from("fund_watchlist")
            .select("*")
            .order("rank", { ascending: true });
        setEntries(data || []);
        setLoading(false);
    }

    async function addStock() {
        const sym = addSymbol.trim().toUpperCase();
        if (!sym || !userId) return;
        const mine = entries.filter((e) => e.user_id === userId);
        const sorted = [...mine].sort((a, b) => a.rank - b.rank);
        const rank = sorted.length > 0 ? sorted[sorted.length - 1].rank + 1 : 1;
        const { data, error } = await supabase
            .from("fund_watchlist")
            .insert({
                user_id: userId,
                display_name: myName || "Me",
                symbol: sym,
                rank,
                note: addNote.trim() || null,
            })
            .select()
            .single();
        if (!error && data) {
            setEntries((prev) => [...prev, data]);
            setAddSymbol("");
            setAddNote("");
            symRef.current?.focus();
        }
    }

    async function deleteStock(id) {
        await supabase.from("fund_watchlist").delete().eq("id", id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }

    async function updateNote(id, note) {
        await supabase.from("fund_watchlist").update({ note }).eq("id", id);
        setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, note } : e)),
        );
    }

    async function moveUp(entry) {
        const mine = entries.filter((e) => e.user_id === userId);
        const sorted = [...mine].sort((a, b) => a.rank - b.rank);
        const idx = sorted.findIndex((e) => e.id === entry.id);
        if (idx === 0) return;
        const above = sorted[idx - 1];
        await supabase
            .from("fund_watchlist")
            .update({ rank: above.rank })
            .eq("id", entry.id);
        await supabase
            .from("fund_watchlist")
            .update({ rank: entry.rank })
            .eq("id", above.id);
        setEntries((prev) =>
            prev.map((e) =>
                e.id === entry.id
                    ? { ...e, rank: above.rank }
                    : e.id === above.id
                      ? { ...e, rank: entry.rank }
                      : e,
            ),
        );
    }

    async function moveDown(entry) {
        const mine = entries.filter((e) => e.user_id === userId);
        const sorted = [...mine].sort((a, b) => a.rank - b.rank);
        const idx = sorted.findIndex((e) => e.id === entry.id);
        if (idx === sorted.length - 1) return;
        const below = sorted[idx + 1];
        await supabase
            .from("fund_watchlist")
            .update({ rank: below.rank })
            .eq("id", entry.id);
        await supabase
            .from("fund_watchlist")
            .update({ rank: entry.rank })
            .eq("id", below.id);
        setEntries((prev) =>
            prev.map((e) =>
                e.id === entry.id
                    ? { ...e, rank: below.rank }
                    : e.id === below.id
                      ? { ...e, rank: entry.rank }
                      : e,
            ),
        );
    }

    function handleDragEnd() {
        if (dragFrom !== null && dragTo !== null && dragFrom !== dragTo) {
            const sorted = [...myEntries]; // already sorted by rank
            const [moved] = sorted.splice(dragFrom, 1);
            sorted.splice(dragTo, 0, moved);
            // Reassign sequential ranks
            sorted.forEach(async (entry, i) => {
                if (entry.rank !== i + 1) {
                    await supabase
                        .from("fund_watchlist")
                        .update({ rank: i + 1 })
                        .eq("id", entry.id);
                }
            });
            setEntries((prev) => [
                ...prev.filter((e) => e.user_id !== userId),
                ...sorted.map((e, i) => ({ ...e, rank: i + 1 })),
            ]);
        }
        setDragFrom(null);
        setDragTo(null);
    }

    // ── Derived ────────────────────────────────────────────────
    const grouped = entries.reduce((acc, e) => {
        if (!acc[e.user_id]) acc[e.user_id] = [];
        acc[e.user_id].push(e);
        return acc;
    }, {});

    const myEntries = (grouped[userId] || []).sort((a, b) => a.rank - b.rank);
    const otherUserIds = Object.keys(grouped).filter((uid) => uid !== userId);
    const allUserIds = Object.keys(grouped);

    // Average column: symbols on ALL members' lists, sorted by mean position
    const avgEntries = (() => {
        if (allUserIds.length < 2) return [];
        // Find symbols present in every user's list
        const common = [...new Set(entries.map((e) => e.symbol))].filter(
            (sym) =>
                allUserIds.every((uid) =>
                    (grouped[uid] || []).some((e) => e.symbol === sym),
                ),
        );
        return common
            .map((sym) => {
                const avgPos =
                    allUserIds.reduce((sum, uid) => {
                        const sorted = (grouped[uid] || []).sort(
                            (a, b) => a.rank - b.rank,
                        );
                        return (
                            sum +
                            (sorted.findIndex((e) => e.symbol === sym) + 1)
                        );
                    }, 0) / allUserIds.length;
                return { symbol: sym, avgPos };
            })
            .sort((a, b) => a.avgPos - b.avgPos);
    })();

    // ── Render ─────────────────────────────────────────────────
    if (loading)
        return (
            <div className="text-slate-500 text-sm py-12 text-center">
                Loading…
            </div>
        );

    const noFinnhub = !localStorage.getItem("bt_finnhub_key");

    // Build tab list for mobile switcher
    const mobileTabs = [
        { id: userId, label: (myName || "You").split(" ")[0], isMe: true },
        ...otherUserIds.map((uid) => {
            const name = (grouped[uid]?.[0]?.display_name || "Anon").split(
                " ",
            )[0];
            return { id: uid, label: name, isMe: false };
        }),
        ...(avgEntries.length > 0
            ? [{ id: "avg", label: "Avg", isMe: false }]
            : []),
    ];

    const colClass = (colId) =>
        `flex-col rounded-xl ring-1 overflow-hidden w-full sm:w-[340px] sm:flex-shrink-0 ${
            mobileTab === colId ? "flex" : "hidden sm:flex"
        }`;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-100">
                        Fund Watchlist
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                        {myName && (
                            <span className="text-blue-400 font-medium">
                                {myName} ·{" "}
                            </span>
                        )}
                        Each member's ranked picks — updates live
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 ring-1 ring-white/[0.06] transition-colors"
                >
                    <RefreshCw size={11} /> Refresh
                </button>
            </div>

            {/* Mobile column switcher — hidden on sm+ */}
            {mobileTabs.length > 1 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar sm:hidden">
                    {mobileTabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setMobileTab(t.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                mobileTab === t.id
                                    ? t.isMe
                                        ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                                        : t.id === "avg"
                                          ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                                          : "bg-white/10 text-slate-200 ring-1 ring-white/20"
                                    : "text-slate-500 hover:text-slate-300 bg-white/[0.04]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {noFinnhub && (
                <div className="mb-4 bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg px-4 py-2.5 text-xs text-amber-400">
                    Add a Finnhub API key in Settings to see live prices and
                    metrics.
                </div>
            )}

            {/* Columns */}
            <div className="sm:flex sm:gap-3 sm:overflow-x-auto no-scrollbar sm:pb-3 space-y-4 sm:space-y-0">
                {/* ── My column ── */}
                <div
                    className={`${colClass(userId)} bg-blue-500/[0.07] ring-blue-500/20`}
                >
                    <div className="px-4 py-3 border-b border-blue-500/20">
                        <p className="text-sm font-bold text-blue-300">
                            {myName || "You"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {myEntries.length} pick
                            {myEntries.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="flex-1 p-1.5 space-y-0.5">
                        {myEntries.map((entry, idx) => (
                            <StockRow
                                key={entry.id}
                                entry={entry}
                                idx={idx}
                                isMe
                                data={metrics[entry.symbol]}
                                debateCounts={debateCounts}
                                voteCounts={voteCounts}
                                userId={userId}
                                displayName={myName}
                                onDelete={deleteStock}
                                onNoteUpdate={updateNote}
                                draggable
                                onDragStart={() => setDragFrom(idx)}
                                onDragEnter={() => setDragTo(idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                isDragSource={dragFrom === idx}
                                isDragTarget={
                                    dragTo !== null &&
                                    dragTo === idx &&
                                    dragFrom !== idx
                                }
                            />
                        ))}
                        {myEntries.length === 0 && (
                            <p className="text-xs text-slate-600 text-center py-6 italic">
                                Add your first pick below
                            </p>
                        )}
                    </div>

                    {/* Add form */}
                    <div className="p-3 border-t border-blue-500/10 space-y-2">
                        <div className="flex gap-1.5">
                            <input
                                ref={symRef}
                                value={addSymbol}
                                onChange={(e) =>
                                    setAddSymbol(e.target.value.toUpperCase())
                                }
                                onKeyDown={(e) =>
                                    e.key === "Enter" && addStock()
                                }
                                placeholder="TICKER"
                                maxLength={10}
                                className="flex-1 min-w-0 bg-slate-900/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                            />
                            <button
                                onClick={addStock}
                                className="bg-blue-600 hover:bg-blue-500 rounded-lg px-2.5 py-1.5 text-white transition-colors shrink-0"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        <input
                            value={addNote}
                            onChange={(e) => setAddNote(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addStock()}
                            placeholder="Note (optional)"
                            className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-400 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* ── Other members' columns ── */}
                {otherUserIds.map((uid) => {
                    const userEntries = (grouped[uid] || []).sort(
                        (a, b) => a.rank - b.rank,
                    );
                    const name = userEntries[0]?.display_name || "Anonymous";
                    return (
                        <div
                            key={uid}
                            className={`${colClass(uid)} bg-slate-800/50 ring-white/[0.06]`}
                        >
                            <div className="px-4 py-3 border-b border-white/[0.05]">
                                <p className="text-sm font-bold text-slate-200">
                                    {name}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {userEntries.length} pick
                                    {userEntries.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="flex-1 p-1.5 space-y-0.5">
                                {userEntries.map((entry, idx) => (
                                    <StockRow
                                        key={entry.id}
                                        entry={entry}
                                        idx={idx}
                                        isMe={false}
                                        data={metrics[entry.symbol]}
                                        debateCounts={debateCounts}
                                voteCounts={voteCounts}
                                        userId={userId}
                                        displayName={myName}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* ── Average column ── */}
                {avgEntries.length > 0 && (
                    <div
                        className={`${colClass("avg")} bg-emerald-500/[0.06] ring-emerald-500/20`}
                    >
                        <div className="px-4 py-3 border-b border-emerald-500/20">
                            <p className="text-sm font-bold text-emerald-400">
                                Fund Average
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                {avgEntries.length} shared · avg rank
                            </p>
                        </div>
                        <div className="flex-1 p-1.5 space-y-0.5">
                            {avgEntries.map(({ symbol, avgPos }, idx) => (
                                <StockRow
                                    key={symbol}
                                    entry={{
                                        id: symbol,
                                        symbol,
                                        user_id: null,
                                        rank: idx + 1,
                                        note: `avg position ${avgPos.toFixed(1)}`,
                                    }}
                                    idx={idx}
                                    isMe={false}
                                    data={metrics[symbol]}
                                    debateCounts={debateCounts}
                                voteCounts={voteCounts}
                                    userId={userId}
                                    displayName={myName}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
