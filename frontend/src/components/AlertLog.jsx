import { fmtDateTime, fmtDuration } from '../lib/utils.js'

function StatusBadge({ active }) {
  if (active) return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      borderRadius:999, padding:'3px 10px',
      fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
      background:'rgba(255,82,82,.1)', color:'var(--color-red)', border:'1px solid rgba(255,82,82,.25)',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
      Active
    </span>
  )
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      borderRadius:999, padding:'3px 10px',
      fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em',
      background:'var(--color-panel-2)', color:'var(--color-t3)', border:'1px solid var(--color-border)',
    }}>
      Cleared
    </span>
  )
}

export default function AlertLog({ alerts }) {
  const sorted = [...(alerts ?? [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return new Date(b.started_at) - new Date(a.started_at)
  })
  const activeCount = sorted.filter(a => a.active).length

  return (
    <div style={{
      borderRadius:16, padding:20,
      background:'var(--color-panel)', border:'1px solid var(--color-border)',
      animation:'fade-up .5s ease',
    }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-t3)' }}>
          Alert Log
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {activeCount > 0 && (
            <span style={{
              display:'inline-flex', alignItems:'center', gap:6,
              borderRadius:999, padding:'4px 12px',
              fontSize:10, fontWeight:700,
              background:'rgba(255,82,82,.1)', color:'var(--color-red)', border:'1px solid rgba(255,82,82,.25)',
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
              {activeCount} active
            </span>
          )}
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t3)' }}>
            {sorted.length} total
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'40px 0', textAlign:'center' }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
            background:'rgba(63,185,80,.08)', border:'1px solid rgba(63,185,80,.2)',
          }}>✓</div>
          <p style={{ fontSize:14, fontWeight:500, color:'var(--color-t2)' }}>No alerts recorded yet</p>
          <p style={{ fontSize:12, color:'var(--color-t3)' }}>Alerts fire when occupancy ≥ threshold</p>
        </div>
      ) : (
        <div style={{ overflow:'hidden', borderRadius:10, border:'1px solid var(--color-border)' }}>
          {/* Table head */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'130px 100px 1fr 90px 100px',
            gap:'0 16px',
            padding:'8px 16px',
            background:'var(--color-panel-2)',
            borderBottom:'1px solid var(--color-border)',
            fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em',
            color:'var(--color-t3)',
          }}>
            <span>Status</span>
            <span>Occupancy</span>
            <span>Started</span>
            <span>Duration</span>
            <span>Cleared</span>
          </div>

          {sorted.slice(0, 15).map((al, i) => (
            <div key={al.id}
              style={{
                display:'grid',
                gridTemplateColumns:'130px 100px 1fr 90px 100px',
                gap:'0 16px',
                alignItems:'center',
                padding:'10px 16px',
                borderTop: i > 0 ? '1px solid rgba(30,58,82,.5)' : 'none',
                background: al.active ? 'rgba(255,82,82,.025)' : 'transparent',
                transition:'background .15s',
                cursor:'default',
              }}
              onMouseEnter={e => e.currentTarget.style.background = al.active ? 'rgba(255,82,82,.05)' : 'rgba(255,255,255,.018)'}
              onMouseLeave={e => e.currentTarget.style.background = al.active ? 'rgba(255,82,82,.025)' : 'transparent'}
            >
              <StatusBadge active={al.active} />

              <div style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>
                <span style={{ color: al.active ? 'var(--color-red)' : 'var(--color-t2)' }}>{al.occupancy_at_alert}</span>
                <span style={{ color:'var(--color-t3)' }}> / {al.threshold_at_alert}</span>
              </div>

              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t2)' }}>
                {fmtDateTime(al.started_at)}
              </div>

              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t3)' }}>
                {fmtDuration(al.started_at, al.cleared_at)}
              </div>

              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t3)' }}>
                {al.cleared_at ? fmtDateTime(al.cleared_at) : '—'}
              </div>
            </div>
          ))}

          {sorted.length > 15 && (
            <div style={{
              padding:'8px 16px', textAlign:'center',
              borderTop:'1px solid var(--color-border)',
              background:'var(--color-panel-2)',
              fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t3)',
            }}>
              {sorted.length - 15} more not shown
            </div>
          )}
        </div>
      )}
    </div>
  )
}
