/** Thin API client – all calls go to /api (proxied to Flask in dev) */
const BASE = '/api'

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
  return json
}

export const api = {
  getBridges:    ()                        => req('/bridges'),
  getOccupancy:  (id)                      => req(`/occupancy/${enc(id)}`),
  getFootfall:   (id, mins = 5, h = 1)    => req(`/footfall/${enc(id)}?bucket_minutes=${mins}&hours=${h}`),
  getAlerts:     (id, activeOnly = false)  => req(`/alerts/${enc(id)}${activeOnly ? '?active=true' : ''}`),
  setThreshold:  (id, threshold)           => req(`/threshold/${enc(id)}`, { method: 'POST', body: JSON.stringify({ threshold }) }),
  resetBridge:   (id)                      => req(`/reset/${enc(id)}`,     { method: 'POST' }),
  postCrossing:  (bridgeId, trackId, dir)  => req('/events/crossing', {
    method: 'POST',
    body: JSON.stringify({ bridge_id: bridgeId, track_id: trackId, direction: dir, timestamp: new Date().toISOString() }),
  }),
}

function enc(id) { return encodeURIComponent(id) }
