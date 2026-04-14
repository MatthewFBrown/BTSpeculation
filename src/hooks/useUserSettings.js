import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useUserSettings(userId) {
  const [finnhubKey, setFinnhubKey] = useState(() => localStorage.getItem('bt_finnhub_key') || '')
  const [avKey, setAvKey] = useState(() => localStorage.getItem('bt_av_key') || '')
  const [mattCapAccess, setMattCapAccess] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase
      .from('user_settings')
      .select('finnhub_key, av_key, matt_cap_access, display_name')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.finnhub_key) {
            setFinnhubKey(data.finnhub_key)
            localStorage.setItem('bt_finnhub_key', data.finnhub_key)
          }
          if (data.av_key) {
            setAvKey(data.av_key)
            localStorage.setItem('bt_av_key', data.av_key)
          }
          setMattCapAccess(data.matt_cap_access ?? false)
          setDisplayName(data.display_name ?? '')
        }
        setLoading(false)
      })
  }, [userId])

  async function saveKeys({ finnhubKey: fk, avKey: ak }) {
    setFinnhubKey(fk)
    setAvKey(ak)
    localStorage.setItem('bt_finnhub_key', fk)
    localStorage.setItem('bt_av_key', ak)
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, finnhub_key: fk, av_key: ak, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }

  async function saveDisplayName(name) {
    setDisplayName(name)
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, display_name: name, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }

  return { finnhubKey, avKey, mattCapAccess, displayName, saveKeys, saveDisplayName, loading }
}
