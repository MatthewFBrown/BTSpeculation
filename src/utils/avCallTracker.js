const KEY = 'bt_av_calls'
const DAILY_LIMIT = 25

function today() {
  return new Date().toISOString().slice(0, 10)
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (raw.date !== today()) return { date: today(), count: 0 }
    return raw
  } catch {
    return { date: today(), count: 0 }
  }
}

export function trackAVCalls(n = 1) {
  const state = load()
  state.count += n
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function getAVCallStats() {
  const { count } = load()
  return { count, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) }
}
