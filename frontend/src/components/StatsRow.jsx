import { getStatus, PALETTE } from '../lib/utils.js'

function MetricCard({ label, value, sub, color = 'teal', icon, alert }) {
  const c = PALETTE[color] ?? PALETTE.teal
  return (
    <div style={{
      position:'relative', overflow:'hidden',
      borderRadius:14, padding:'16px 18px',
      background:`linear-gradient(135deg, var(--color-panel) 0%, color-mix(in srgb, ${c} 7%, var(--color-panel)) 100%)`,
      border:`1px solid color-mix(in srgb, ${c} 20%, var(--color-border))`,
      animation:'fade-up .35s ease both',
    }}>
      {/* glow */}
      <div style={{
        position:'absolute', top:-16, right:-16,
        width:64, height:64, borderRadius:'50%',
        background:c, opacity:.18, filter:'blur(20px)',
        pointerEvents:'none',
      }} />

      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-t3)' }}>
            {label}
          </span>
          <span style={{ fontSize:18, opacity:.55 }}>{icon}</span>
        </div>

        <div style={{ fontFamily:'var(--font-mono)', fontSize:36, fontWeight:900, lineHeight:1, color:c }}>
          {value ?? '—'}
        </div>

        {sub && (
          <div style={{ marginTop:6, fontSize:11, color:'var(--color-t3)' }}>{sub}</div>
        )}

        {alert && (
          <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
            <span style={{ fontSize:10, fontWeight:700, color:'var(--color-red)' }}>{alert}</span>
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
  const active   = (alerts ?? []).filter(a => a.active).length

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'repeat(4, minmax(0, 1fr))',
      gap:12,
    }}>
      <MetricCard
        label="On Bridge Now"
        value={occ}
        sub={`of ${thr} max · ${Math.round(pct)}% full`}
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
