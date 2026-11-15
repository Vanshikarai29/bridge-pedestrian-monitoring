import { getStatus, COLOR } from '../lib/utils.js'

function Card({ label, value, sub, color = 'teal', icon }) {
  const col = COLOR[color]
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-border-2)]"
      style={{ background: `linear-gradient(135deg, var(--color-surface-2) 0%, ${col.bg} 100%)` }}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full blur-xl" style={{ background: col.glow, opacity: 0.4 }} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-3)]">{label}</span>
          <span className="text-base opacity-70">{icon}</span>
        </div>
        <div className="font-mono text-3xl font-black" style={{ color: col.fill }}>{value}</div>
        {sub && <div className="mt-1 text-[11px] text-[var(--color-text-3)]">{sub}</div>}
      </div>
    </div>
  )
}

export default function StatsRow({ occupancy, footfall, alerts }) {
  const occ  = occupancy?.occupancy ?? 0
  const thr  = occupancy?.threshold ?? 40
  const { ratio } = getStatus(occ, thr)

  // Aggregate footfall totals for the current window
  const buckets = footfall?.buckets ?? []
  const totalIn  = buckets.reduce((s, b) => s + (b.in ?? 0), 0)
  const totalOut = buckets.reduce((s, b) => s + (b.out ?? 0), 0)
  const net      = totalIn - totalOut

  const activeAlerts = (alerts ?? []).filter(a => a.active).length

  const capColor = ratio >= 1 ? 'red' : ratio >= 0.8 ? 'amber' : 'teal'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label="Pedestrians In"
        value={totalIn || '—'}
        sub={`last ${footfall?.bucket_minutes ? Math.round((footfall.buckets?.length ?? 0) * footfall.bucket_minutes / 60 * 10) / 10 : 2}h`}
        color="teal"
        icon="↑"
      />
      <Card
        label="Pedestrians Out"
        value={totalOut || '—'}
        sub="same window"
        color="blue"
        icon="↓"
      />
      <Card
        label="Net Flow"
        value={totalIn || totalOut ? (net >= 0 ? `+${net}` : net) : '—'}
        sub="in minus out"
        color={net > 0 ? 'teal' : net < 0 ? 'amber' : 'blue'}
        icon="⇆"
      />
      <Card
        label="Active Alerts"
        value={activeAlerts}
        sub={activeAlerts === 0 ? 'all clear' : 'threshold breached'}
        color={activeAlerts > 0 ? 'red' : 'teal'}
        icon={activeAlerts > 0 ? '⚠' : '✓'}
      />
    </div>
  )
}
