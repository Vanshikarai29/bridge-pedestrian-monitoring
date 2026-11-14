import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useDashboard(bridgeId, intervalMs = 3000) {
  const [occupancy,   setOccupancy]   = useState(null)
  const [footfall,    setFootfall]    = useState(null)
  const [alerts,      setAlerts]      = useState([])
  const [bridges,     setBridges]     = useState([])
  const [status,      setStatus]      = useState('connecting') // 'ok' | 'err' | 'connecting'
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
      setOccupancy(occ)
      setFootfall(ff)
      setAlerts(al)
      setBridges(br)
      setStatus('ok')
      setLastUpdated(new Date())
    } catch (e) {
      setStatus('err')
      console.error('[poll]', e.message)
    }
  }, [bridgeId])

  useEffect(() => {
    setStatus('connecting')
    fetchAll()
    timer.current = setInterval(fetchAll, intervalMs)
    return () => clearInterval(timer.current)
  }, [fetchAll, intervalMs])

  return { occupancy, footfall, alerts, bridges, status, lastUpdated, refresh: fetchAll }
}
