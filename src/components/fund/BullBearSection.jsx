import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'

function fmtAge(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const inputCls = 'w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none'

// Stable form component — owns its own text state so parent re-renders don't remount it
function ArgumentForm({ placeholder, initialText = '', onSubmit, onCancel }) {
  const [text, setText] = useState(initialText)
  return (
    <div className="mt-1.5 space-y-1.5">
      <textarea
        autoFocus rows={2}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        placeholder={placeholder}
        className={inputCls}
      />
      <div className="flex gap-1.5">
        <button onClick={onCancel} className="px-3 py-1 rounded text-xs text-slate-400 hover:text-slate-200 bg-slate-700 transition-colors">Cancel</button>
        <button onClick={() => onSubmit(text)} disabled={!text.trim()} className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors">Submit</button>
      </div>
    </div>
  )
}

export default function BullBearSection({ symbol, userId, displayName }) {
  const [args,  setArgs]  = useState([])
  const [votes, setVotes] = useState([])
  const [form,  setForm]  = useState(null)
  // Unique channel name per mount to avoid Supabase channel reuse conflicts
  const channelName = useRef(`bullbear_${symbol}_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    Promise.all([
      supabase.from('fund_bull_bear_args').select('*').eq('symbol', symbol).order('created_at'),
      supabase.from('fund_bull_bear_votes').select('*').eq('symbol', symbol),
    ]).then(([a, v]) => {
      setArgs(a.data || [])
      setVotes(v.data || [])
    })

    const ch = supabase.channel(channelName.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_args' },
        ({ eventType, new: n, old: o }) => {
          if (n?.symbol !== symbol && o?.symbol !== symbol) return
          if (eventType === 'INSERT') setArgs(prev => [...prev, n])
          if (eventType === 'UPDATE') setArgs(prev => prev.map(a => a.id === n.id ? n : a))
          if (eventType === 'DELETE') setArgs(prev => prev.filter(a => a.id !== o.id))
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_votes' },
        ({ eventType, new: n, old: o }) => {
          if (n?.symbol !== symbol && o?.symbol !== symbol) return
          if (eventType === 'INSERT') setVotes(prev => [...prev, n])
          if (eventType === 'UPDATE') setVotes(prev => prev.map(v => v.id === n.id ? n : v))
          if (eventType === 'DELETE') setVotes(prev => prev.filter(v => v.id !== o.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [symbol])

  async function submitArg(text, { stance, parentId, editId }) {
    if (!text?.trim()) return
    setForm(null)

    if (editId) {
      const { data } = await supabase.from('fund_bull_bear_args').update({ body: text }).eq('id', editId).select().single()
      if (data) setArgs(prev => prev.map(a => a.id === editId ? data : a))
    } else if (!parentId) {
      const existing = args.find(a => a.user_id === userId && a.stance === stance && !a.parent_id)
      if (existing) {
        const { data } = await supabase.from('fund_bull_bear_args').update({ body: text }).eq('id', existing.id).select().single()
        if (data) setArgs(prev => prev.map(a => a.id === existing.id ? data : a))
      } else {
        const { data } = await supabase.from('fund_bull_bear_args')
          .insert({ symbol, user_id: userId, display_name: displayName, stance, body: text })
          .select().single()
        if (data) setArgs(prev => [...prev, data])
      }
    } else {
      const parent = args.find(a => a.id === parentId)
      const { data } = await supabase.from('fund_bull_bear_args')
        .insert({ symbol, user_id: userId, display_name: displayName, stance: parent?.stance || stance, body: text, parent_id: parentId })
        .select().single()
      if (data) setArgs(prev => [...prev, data])
    }
  }

  async function deleteArg(id) {
    await supabase.from('fund_bull_bear_args').delete().eq('id', id)
    setArgs(prev => prev.filter(a => a.id !== id && a.parent_id !== id))
  }

  async function castVote(vote) {
    const existing = votes.find(v => v.user_id === userId)
    if (existing?.vote === vote) {
      await supabase.from('fund_bull_bear_votes').delete().eq('id', existing.id)
      setVotes(prev => prev.filter(v => v.id !== existing.id))
    } else {
      const { data } = await supabase.from('fund_bull_bear_votes')
        .upsert({ symbol, user_id: userId, display_name: displayName, vote }, { onConflict: 'symbol,user_id' })
        .select().single()
      if (data) setVotes(prev => [...prev.filter(v => v.user_id !== userId), data])
    }
  }

  const topLevel = stance => args.filter(a => a.stance === stance && !a.parent_id)
  const replies  = parentId => args.filter(a => a.parent_id === parentId)
  const myVote   = votes.find(v => v.user_id === userId)?.vote

  function ArgCard({ arg }) {
    const isOwn      = arg.user_id === userId
    const argReplies = replies(arg.id)
    const isEditing  = form?.editId === arg.id
    const isReplying = form?.parentId === arg.id

    return (
      <div className="space-y-1">
        <div className="rounded-lg p-2.5 bg-slate-900/50 ring-1 ring-white/[0.04]">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-semibold text-slate-400">
              {arg.display_name || 'Anon'}
              <span className="font-normal text-slate-600"> · {fmtAge(arg.created_at)}</span>
            </span>
            {isOwn && !isEditing && (
              <div className="flex gap-2">
                <button onClick={() => setForm({ stance: arg.stance, parentId: null, editId: arg.id })} className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">Edit</button>
                <button onClick={() => deleteArg(arg.id)} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">Delete</button>
              </div>
            )}
          </div>
          {isEditing
            ? <ArgumentForm
                key={`edit-${arg.id}`}
                placeholder="Edit your argument…"
                initialText={arg.body}
                onSubmit={text => submitArg(text, form)}
                onCancel={() => setForm(null)}
              />
            : <p className="text-xs text-slate-200 leading-relaxed">{arg.body}</p>
          }
          {!isEditing && (
            <button
              onClick={() => setForm({ stance: arg.stance, parentId: arg.id, editId: null })}
              className="mt-1.5 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >↩ Reply</button>
          )}
        </div>

        {isReplying && (
          <ArgumentForm
            key={`reply-${arg.id}`}
            placeholder="Write a reply…"
            onSubmit={text => submitArg(text, form)}
            onCancel={() => setForm(null)}
          />
        )}

        {argReplies.length > 0 && (
          <div className="ml-3 pl-3 border-l border-white/[0.05] space-y-1">
            {argReplies.map(r => (
              <div key={r.id} className="rounded-lg p-2 bg-slate-900/30">
                <span className="text-[10px] text-slate-500">{r.display_name || 'Anon'} · {fmtAge(r.created_at)}</span>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{r.body}</p>
                {r.user_id === userId && (
                  <button onClick={() => deleteArg(r.id)} className="mt-0.5 text-[10px] text-slate-700 hover:text-red-400 transition-colors">Delete</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function Column({ stance }) {
    const isBull   = stance === 'bull'
    const tlArgs   = topLevel(stance)
    const isAdding = form?.stance === stance && !form.parentId && !form.editId

    return (
      <div className={`flex-1 min-w-0 border-t-2 pt-3 ${isBull ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] mb-3 ${isBull ? 'text-emerald-400' : 'text-red-400'}`}>
          {isBull ? '🟢 Bull Case' : '🔴 Bear Case'}
        </p>
        <div className="space-y-2">
          {tlArgs.map(arg => <ArgCard key={arg.id} arg={arg} />)}
        </div>
        {tlArgs.length === 0 && !isAdding && (
          <p className="text-xs text-slate-700 italic mb-2">No argument yet</p>
        )}
        {isAdding
          ? <ArgumentForm
              key={`add-${stance}`}
              placeholder={isBull ? 'Make the bull case…' : 'Make the bear case…'}
              onSubmit={text => submitArg(text, form)}
              onCancel={() => setForm(null)}
            />
          : <button
              onClick={() => setForm({ stance, parentId: null, editId: null })}
              className={`mt-2 text-[11px] transition-colors ${isBull ? 'text-emerald-700 hover:text-emerald-400' : 'text-red-700 hover:text-red-400'}`}
            >+ {isBull ? 'Add bull case' : 'Add bear case'}</button>
        }
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3">
      <div className="flex gap-4">
        <Column stance="bull" />
        <div className="w-px bg-white/[0.05] shrink-0 self-stretch" />
        <Column stance="bear" />
      </div>

      <div className="pt-2.5 border-t border-white/[0.04] flex items-center gap-2.5 flex-wrap">
        <span className="text-[10px] text-slate-600 uppercase tracking-wide shrink-0">Conviction</span>
        <button
          onClick={() => castVote('bull')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${myVote === 'bull' ? 'bg-emerald-600 text-white' : 'ring-1 ring-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'}`}
        >🟢 Bull</button>
        <button
          onClick={() => castVote('bear')}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${myVote === 'bear' ? 'bg-red-600 text-white' : 'ring-1 ring-red-500/30 text-red-600 hover:bg-red-500/10'}`}
        >🔴 Bear</button>
        {votes.length > 0 && (
          <span className="text-[10px] text-slate-600">
            {votes.map(v => `${(v.display_name || 'Anon').split(' ')[0]} ${v.vote === 'bull' ? '🟢' : '🔴'}`).join('  ·  ')}
          </span>
        )}
      </div>
    </div>
  )
}
