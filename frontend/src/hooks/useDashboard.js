import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useDashboard(bridgeId, intervalMs = 3000) {
  const [data,   setData]   = useState({ occupancy: null, footfall: null, alerts: [], bridges: [] })
  const [status, setStatus] = useState('connecting')
  const [lastUpdated, setLastUpdated] = useState(null)
  const timer = useRef(null)

  const fetchAll = useCallback(async () => {
    if (!bridgeId) return
    try {
      const [occ, ff, al, br] = await Promise.all([
        api.getOccupancy(bridgeId),
        api.getFootfall(bridgeId, 5, 2),
        api.getAlerts(bridgeId),
        api.getBridges(),
      ])
      setData({ occupancy: occ, footfall: ff, alerts: al, bridges: br })
      setStatus('ok')
      setLastUpdated(new Date())
    } catch (e) {
      setStatus('err')
      console.error('[poll]', e.message)
    }
  }, [bridgeId])

  const fetchFootfall = useCallback(async (mins, hours) => {
    try {
      const ff = await api.getFootfall(bridgeId, mins, hours)
      setData(prev => ({ ...prev, footfall: ff }))
    } catch {}
  }, [bridgeId])

  useEffect(() => {
    setStatus('connecting')
    setData({ occupancy: null, footfall: null, alerts: [], bridges: [] })
    fetchAll()
    timer.current = setInterval(fetchAll, intervalMs)
    return () => clearInterval(timer.current)
  }, [fetchAll, intervalMs])

  return { ...data, status, lastUpdated, refresh: fetchAll, fetchFootfall }
}
