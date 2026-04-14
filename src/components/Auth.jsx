import { useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0c1524] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white tracking-tight">BT Speculation</div>
          <div className="text-slate-400 text-sm mt-1">Trading & Portfolio Tracker</div>
        </div>

        <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-6">
          <h2 className="text-white font-semibold text-lg mb-5">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-700/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {message && (
              <div className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors shadow-[0_0_18px_rgba(59,130,246,0.35)]"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            {mode === 'signin' ? (
              <>No account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); setMessage(null) }} className="text-blue-400 hover:text-blue-300">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null); setMessage(null) }} className="text-blue-400 hover:text-blue-300">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
