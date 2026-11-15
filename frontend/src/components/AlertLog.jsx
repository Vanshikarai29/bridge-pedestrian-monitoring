import { fmtDateTime, fmtDuration } from '../lib/utils.js'

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-red)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-red)] ring-1 ring-[var(--color-red)]/25">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" style={{ animation: 'pulse-red 1.5s ease-in-out infinite' }} />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-3)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-3)] ring-1 ring-[var(--color-border)]">
      Cleared
    </span>
  )
}

export default function AlertLog({ alerts }) {
  const sorted = [...(alerts ?? [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return new Date(b.started_at) - new Date(a.started_at)
  })

  const active = sorted.filter(a => a.active).length

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-3)]">Alert Log</h2>
        </div>
        <div className="flex items-center gap-3">
          {active > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-red)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--color-red)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" style={{ animation: 'pulse-red 1.5s ease-in-out infinite' }} />
              {active} active
            </span>
          )}
          <span className="font-mono text-[11px] text-[var(--color-text-3)]">{sorted.length} total</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-teal)]/10 text-xl">✓</div>
          <p className="font-medium text-[var(--color-text-2)]">No alerts recorded</p>
          <p className="text-sm text-[var(--color-text-3)]">Alerts fire when occupancy ≥ threshold</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {/* Table header */}
          <div className="grid grid-cols-[120px_1fr_1fr_100px_100px] border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-3)]">
            <span>Status</span>
            <span>Occupancy</span>
            <span>Started</span>
            <span className="hidden sm:block">Duration</span>
            <span className="hidden sm:block">Cleared</span>
          </div>

          <div className="divide-y divide-[var(--color-border)]/50">
            {sorted.slice(0, 15).map(alert => (
              <div
                key={alert.id}
                className={`grid grid-cols-[120px_1fr_1fr_100px_100px] items-center px-4 py-3 text-xs transition-colors hover:bg-[var(--color-surface-3)]/30 ${
                  alert.active ? 'bg-[var(--color-red)]/[0.025]' : ''
                }`}
              >
                <StatusBadge active={alert.active} />

                <div className="font-mono">
                  <span style={{ color: alert.active ? 'var(--color-red)' : 'var(--color-text-2)' }}>
                    {alert.occupancy_at_alert}
                  </span>
                  <span className="text-[var(--color-text-3)]"> / {alert.threshold_at_alert}</span>
                </div>

                <div className="font-mono text-[11px] text-[var(--color-text-2)]">
                  {fmtDateTime(alert.started_at)}
                </div>

                <div className="hidden font-mono text-[11px] text-[var(--color-text-3)] sm:block">
                  {fmtDuration(alert.started_at, alert.cleared_at)}
                </div>

                <div className="hidden font-mono text-[11px] text-[var(--color-text-3)] sm:block">
                  {alert.cleared_at ? fmtDateTime(alert.cleared_at) : '—'}
                </div>
              </div>
            ))}
          </div>

          {sorted.length > 15 && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-2.5 text-center font-mono text-[11px] text-[var(--color-text-3)]">
              {sorted.length - 15} more alerts not shown
            </div>
          )}
        </div>
      )}
    </div>
  )
}
