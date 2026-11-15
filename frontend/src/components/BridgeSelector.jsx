import { useState } from 'react'

export default function BridgeSelector({ bridges, selected, onChange }) {
  const [custom, setCustom] = useState('')
  const [editing, setEditing] = useState(false)

  const all = [...new Set([
    ...bridges.map(b => b.bridge_id),
    'bridge-1',
    ...(selected && !bridges.find(b => b.bridge_id === selected) ? [selected] : []),
  ])]

  const handleSubmit = (e) => {
    e.preventDefault()
    const val = custom.trim()
    if (val) { onChange(val); setCustom(''); setEditing(false) }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Label */}
      <span className="text-xs font-semibold text-slate-dim uppercase tracking-widest">Bridge</span>

      {/* Chip list */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {all.map(id => {
          const bridge = bridges.find(b => b.bridge_id === id)
          const active = id === selected
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                active
                  ? 'border-teal-500/60 bg-teal-500/10 text-teal-500 shadow-sm shadow-teal-500/10'
                  : 'border-navy-400/50 bg-navy-700/40 text-slate-muted hover:border-navy-300/60 hover:text-slate-text'
              }`}
            >
              {bridge?.alert_active && (
                <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 [animation:var(--animate-pulse-red)]" />
              )}
              {id}
              {active && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-teal-500 [animation:var(--animate-pulse-teal)]" />
              )}
            </button>
          )
        })}

        {/* Add custom bridge */}
        {editing ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-1">
            <input
              autoFocus
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onBlur={() => { if (!custom.trim()) setEditing(false) }}
              placeholder="bridge-id"
              className="w-28 rounded-full border border-navy-300/60 bg-navy-600/50 px-3 py-1 text-xs font-mono text-slate-text placeholder-slate-dim outline-none focus:border-teal-500/60"
            />
            <button
              type="submit"
              className="rounded-full border border-teal-500/50 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-500 hover:bg-teal-500/20 transition-colors"
            >Go</button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-navy-400/50 bg-navy-700/40 px-2.5 py-1 text-xs text-slate-dim hover:text-slate-muted transition-colors"
            >✕</button>
          </form>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-dashed border-navy-300/40 bg-transparent px-3 py-1 text-xs text-slate-dim hover:border-navy-300/70 hover:text-slate-muted transition-all"
          >+ Add</button>
        )}
      </div>
    </div>
  )
}

