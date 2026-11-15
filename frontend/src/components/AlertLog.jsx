import { fmtDateTime, fmtDuration } from '../lib/utils.js'

export default function AlertLog({ alerts }) {
  const sorted = [...(alerts ?? [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return new Date(b.started_at) - new Date(a.started_at)
  })
  const activeCount = sorted.filter(a => a.active).length

  return (
    <div className="rounded-2xl p-6" style={{ background:'var(--color-panel)', outline:'1px solid var(--color-border)', animation:'fade-up .5s ease' }}>

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--color-t3)' }}>
          Alert Log
        </h2>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background:'rgba(255,82,82,.1)', color:'var(--color-red)', outline:'1px solid rgba(255,82,82,.25)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
              {activeCount} active
            </span>
          )}
          <span className="font-mono text-[11px]" style={{ color:'var(--color-t3)' }}>{sorted.length} total</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{ background:'rgba(63,185,80,.08)', outline:'1px solid rgba(63,185,80,.2)' }}>✓</div>
          <p className="font-medium" style={{ color:'var(--color-t2)' }}>No alerts recorded yet</p>
          <p className="text-sm" style={{ color:'var(--color-t3)' }}>Alerts fire when occupancy ≥ threshold</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ outline:'1px solid var(--color-border)' }}>
          {/* Table head */}
          <div className="grid gap-4 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{
              gridTemplateColumns:'130px 1fr 1fr 90px 100px',
              background:'var(--color-panel-2)',
              borderBottom:'1px solid var(--color-border)',
              color:'var(--color-t3)',
            }}>
            <span>Status</span>
            <span>Occupancy</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Cleared</span>
          </div>

          {/* Rows */}
          <div>
            {sorted.slice(0, 15).map((al, i) => (
              <div key={al.id}
                className="grid gap-4 items-center px-4 py-3 text-xs transition-colors"
                style={{
                  gridTemplateColumns:'130px 1fr 1fr 90px 100px',
                  borderTop: i > 0 ? '1px solid rgba(30,58,82,.5)' : 'none',
                  background: al.active ? 'rgba(255,82,82,.025)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = al.active ? 'rgba(255,82,82,.04)' : 'rgba(255,255,255,.015)'}
                onMouseLeave={e => e.currentTarget.style.background = al.active ? 'rgba(255,82,82,.025)' : 'transparent'}>

                {/* Status badge */}
                {al.active ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background:'rgba(255,82,82,.1)', color:'var(--color-red)', outline:'1px solid rgba(255,82,82,.25)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background:'var(--color-panel-2)', color:'var(--color-t3)', outline:'1px solid var(--color-border)' }}>
                    Cleared
                  </span>
                )}

                <div className="font-mono">
                  <span style={{ color: al.active ? 'var(--color-red)' : 'var(--color-t2)' }}>{al.occupancy_at_alert}</span>
                  <span style={{ color:'var(--color-t3)' }}> / {al.threshold_at_alert}</span>
                </div>

                <div className="font-mono text-[11px]" style={{ color:'var(--color-t2)' }}>
                  {fmtDateTime(al.started_at)}
                </div>

                <div className="font-mono text-[11px]" style={{ color:'var(--color-t3)' }}>
                  {fmtDuration(al.started_at, al.cleared_at)}
                </div>

                <div className="font-mono text-[11px]" style={{ color:'var(--color-t3)' }}>
                  {al.cleared_at ? fmtDateTime(al.cleared_at) : '—'}
                </div>
              </div>
            ))}
          </div>

          {sorted.length > 15 && (
            <div className="px-4 py-2.5 text-center font-mono text-[11px]"
              style={{ borderTop:'1px solid var(--color-border)', background:'var(--color-panel-2)', color:'var(--color-t3)' }}>
              {sorted.length - 15} more not shown
            </div>
          )}
        </div>
      )}
    </div>
  )
}
