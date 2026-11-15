export const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) }
  catch { return '—' }
}
export const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) }
  catch { return '—' }
}
export const fmtDuration = (start, end = null) => {
  try {
    const s = Math.floor((new Date(end ?? Date.now()) - new Date(start)) / 1000)
    if (s < 60)  return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60)  return `${m}m ${s%60}s`
    if (m < 1440) return `${Math.floor(m/60)}h ${m%60}m`
    return `${Math.floor(m/1440)}d ${Math.floor((m%1440)/60)}h`
  } catch { return '—' }
}

/** Returns { ratio (0..∞), pct (0..100 clamped), label, color } */
export function getStatus(occ, thr) {
  const ratio = thr > 0 ? occ / thr : 0
  const pct   = Math.min(ratio * 100, 100)
  if (ratio >= 1)   return { ratio, pct, label:'Overcrowded', color:'red'  }
  if (ratio >= 0.8) return { ratio, pct, label:'Near Limit',  color:'amber'}
  if (ratio >= 0.4) return { ratio, pct, label:'Moderate',    color:'teal' }
  return                   { ratio, pct, label:'Clear',       color:'green'}
}

export const PALETTE = {
  teal:  '#00e5cc',
  amber: '#ffb547',
  red:   '#ff5252',
  green: '#3fb950',
  blue:  '#58a6ff',
}
