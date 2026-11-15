export const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
export const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
export const fmtDuration = (start, end = null) => {
  try {
    const s = Math.floor((new Date(end ?? Date.now()) - new Date(start)) / 1000)
    if (s < 60)  return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60)  return `${m}m ${s % 60}s`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  } catch { return '—' }
}

/** ratio = occupancy / threshold, clamped 0-1 for display, unbounded for state */
export const getStatus = (occ, thr) => {
  const ratio = thr > 0 ? occ / thr : 0
  if (ratio >= 1)   return { label: 'Overcrowded', color: 'red',   ratio }
  if (ratio >= 0.8) return { label: 'Near Limit',  color: 'amber', ratio }
  if (ratio >= 0.5) return { label: 'Moderate',    color: 'blue',  ratio }
  return                   { label: 'Nominal',      color: 'teal',  ratio }
}

export const COLOR = {
  teal:  { fill: '#2fd4c0', glow: 'rgba(47,212,192,.4)',  bg: 'rgba(47,212,192,.08)',  ring: 'rgba(47,212,192,.2)'  },
  amber: { fill: '#f5a623', glow: 'rgba(245,166,35,.4)',  bg: 'rgba(245,166,35,.08)',  ring: 'rgba(245,166,35,.2)'  },
  red:   { fill: '#f05252', glow: 'rgba(240,82,82,.4)',   bg: 'rgba(240,82,82,.08)',   ring: 'rgba(240,82,82,.2)'   },
  blue:  { fill: '#4fa8ff', glow: 'rgba(79,168,255,.4)',  bg: 'rgba(79,168,255,.08)',  ring: 'rgba(79,168,255,.2)'  },
}
