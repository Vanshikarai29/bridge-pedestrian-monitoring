export const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

export const fmtDuration = (start, end = null) => {
  try {
    const ms = new Date(end ?? Date.now()) - new Date(start)
    const s = Math.floor(ms / 1000)
    if (s < 60)   return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60)   return `${m}m ${s % 60}s`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  } catch { return '—' }
}

export const pct = (val, total) =>
  total > 0 ? Math.min(100, Math.max(0, (val / total) * 100)) : 0

export const occupancyColor = (ratio) => {
  if (ratio >= 1)    return { bar: '#e2574c', text: '#e2574c', glow: 'rgba(226,87,76,.35)' }
  if (ratio >= 0.8)  return { bar: '#f0a63d', text: '#f0a63d', glow: 'rgba(240,166,61,.3)'  }
  return               { bar: '#2fd4c0', text: '#2fd4c0', glow: 'rgba(47,212,192,.3)'  }
}

export const occupancyLabel = (ratio) => {
  if (ratio >= 1)    return { label: 'overcrowded', cls: 'bg-crimson-400/10 text-crimson-400 ring-1 ring-crimson-400/30' }
  if (ratio >= 0.8)  return { label: 'near limit',  cls: 'bg-amber-400/10  text-amber-400  ring-1 ring-amber-400/30'  }
  if (ratio >= 0.5)  return { label: 'moderate',    cls: 'bg-sky-400/10    text-sky-400    ring-1 ring-sky-400/30'    }
  return               { label: 'nominal',    cls: 'bg-teal-500/10   text-teal-500   ring-1 ring-teal-500/30'   }
}
