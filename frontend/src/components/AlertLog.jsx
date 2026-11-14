import { fmtDateTime, fmtDuration } from '../lib/utils.js'

function AlertBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-crimson-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-crimson-400 ring-1 ring-crimson-400/30">
      <span className="h-1.5 w-1.5 rounded-full bg-crimson-400 [animation:var(--animate-pulse-red)]" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-dim ring-1 ring-navy-400/30">
      Cleared
    </span>
  )
}

export default function AlertLog({ alerts }) {
  const sorted = [...(alerts ?? [])].sort((a, b) => {
    // Active first, then by most recent
    if (a.active !== b.active) return a.active ? -1 : 1
    return new Date(b.started_at) - new Date(a.started_at)
  })

  return (
    <div className="rounded-2xl border border-navy-400/50 bg-navy-700/60 p-5 backdrop-blur-sm [animation:var(--animate-fade-up)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-dim">Alert Log</h2>
        <span className="font-mono text-[11px] text-slate-dim/60">
          {sorted.filter(a => a.active).length} active · {sorted.length} total
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="text-3xl opacity-20">🟢</span>
          <p className="text-sm font-medium text-slate-dim">No alerts recorded yet</p>
          <p className="text-[11px] text-slate-dim/60">Alerts fire when occupancy ≥ threshold</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-navy-400/30">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-x-4 border-b border-navy-400/30 bg-navy-800/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-dim">
            <span>Status</span>
            <span>Occupancy</span>
            <span>Started</span>
            <span className="hidden sm:block">Duration</span>
            <span className="hidden sm:block">Cleared at</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-navy-400/20">
            {sorted.slice(0, 12).map(alert => (
              <div
                key={alert.id}
                className={`grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-x-4 px-4 py-3 text-xs transition-colors hover:bg-navy-600/30 ${
                  alert.active ? 'bg-crimson-400/[0.03]' : ''
                }`}
              >
                <AlertBadge active={alert.active} />

                <div className="font-mono">
                  <span className={alert.active ? 'text-crimson-400' : 'text-slate-muted'}>
                    {alert.occupancy_at_alert}
                  </span>
                  <span className="text-slate-dim"> / {alert.threshold_at_alert}</span>
                </div>

                <div className="font-mono text-slate-muted text-[11px]">
                  {fmtDateTime(alert.started_at)}
                </div>

                <div className="hidden font-mono text-slate-dim text-[11px] sm:block">
                  {fmtDuration(alert.started_at, alert.cleared_at)}
                </div>

                <div className="hidden font-mono text-slate-dim text-[11px] sm:block">
                  {alert.cleared_at ? fmtDateTime(alert.cleared_at) : '—'}
                </div>
              </div>
            ))}
          </div>

          {sorted.length > 12 && (
            <div className="border-t border-navy-400/30 bg-navy-800/60 px-4 py-2 text-center text-[11px] text-slate-dim">
              {sorted.length - 12} more alerts not shown
            </div>
          )}
        </div>
      )}
    </div>
  )
}
