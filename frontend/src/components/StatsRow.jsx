import { getStatus, PALETTE } from '../lib/utils.js'

function MetricCard({ label, value, sub, color = 'teal', icon, alert }) {
  const c = PALETTE[color] ?? PALETTE.teal
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 transition-all"
      style={{
        background: `linear-gradient(135deg, var(--color-panel) 0%, color-mix(in srgb, ${c} 6%, var(--color-panel)) 100%)`,
        outline: `1px solid color-mix(in srgb, ${c} 20%, var(--color-border))`,
        animation: 'fade-up .4s ease both',
      }}>
      {/* Glow blob */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{ background: c, opacity: .15 }} />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color:'var(--color-t3)' }}>
            {label}
          </span>
          <span className="text-lg opacity-60">{icon}</span>
        </div>

        <div className="font-mono text-4xl font-black leading-none" style={{ color: c }}>
          {value ?? '—'}
        </div>

        {sub && (
          <div className="mt-2 text-[11px]" style={{ color:'var(--color-t3)' }}>{sub}</div>
        )}

        {alert && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
            <span className="text-[10px] font-semibold" style={{ color:'var(--color-red)' }}>{alert}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StatsRow({ occupancy, footfall, alerts }) {
  const occ  = occupancy?.occupancy ?? 0
  const thr  = occupancy?.threshold ?? 40
  const { pct, color } = getStatus(occ, thr)

  const buckets  = footfall?.buckets ?? []
  const totalIn  = buckets.reduce((s, b) => s + (b.in  ?? 0), 0)
  const totalOut = buckets.reduce((s, b) => s + (b.out ?? 0), 0)
  const net      = totalIn - totalOut
  const active   = (alerts ?? []).filter(a => a.active).length

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <MetricCard
        label="On Bridge Now"
        value={occ}
        sub={`of ${thr} max · ${Math.round(pct)}% capacity`}
        color={color}
        icon="🧍"
        alert={occ > thr ? `${occ - thr} over limit` : null}
      />
      <MetricCard
        label="Entered (last 2h)"
        value={totalIn || '—'}
        sub="crossing events"
        color="teal"
        icon="↑"
      />
      <MetricCard
        label="Exited (last 2h)"
        value={totalOut || '—'}
        sub="crossing events"
        color="blue"
        icon="↓"
      />
      <MetricCard
        label="Active Alerts"
        value={active}
        sub={active === 0 ? 'All clear' : 'Threshold breached'}
        color={active > 0 ? 'red' : 'green'}
        icon={active > 0 ? '⚠' : '✓'}
      />
    </div>
  )
}
