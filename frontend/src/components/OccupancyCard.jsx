import { useState } from 'react'
import { getStatus, PALETTE } from '../lib/utils.js'
import { api } from '../lib/api.js'

function GaugeRing({ pct, color }) {
  const c   = PALETTE[color] ?? PALETTE.teal
  const R   = 80
  const cx  = 100, cy = 100
  const sweepDeg = (Math.min(pct, 100) / 100) * 360
  const startAngle = -90
  const endAngle   = startAngle + sweepDeg
  const toXY = (deg) => ({
    x: cx + R * Math.cos((deg * Math.PI) / 180),
    y: cy + R * Math.sin((deg * Math.PI) / 180),
  })
  const s = toXY(startAngle)
  const e = toXY(endAngle)
  const largeArc = sweepDeg > 180 ? 1 : 0
  const arcPath  = `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`
  const isFullCircle = pct >= 100

  return (
    <svg viewBox="0 0 200 200" style={{ width:'100%', maxWidth:200, display:'block', margin:'0 auto' }}>
      {/* Track */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
      {/* Arc */}
      {!isFullCircle && pct > 0 && (
        <path d={arcPath} fill="none" stroke={c} strokeWidth="14" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 10px ${c}88)`, transition:'all .8s cubic-bezier(.4,0,.2,1)' }} />
      )}
      {isFullCircle && (
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={c} strokeWidth="14"
          style={{ filter:`drop-shadow(0 0 14px ${c}99)` }} />
      )}
      {/* Quarter tick marks */}
      {[0,90,180,270].map(deg => {
        const a = deg - 90
        const ix = cx + (R-10)*Math.cos(a*Math.PI/180), iy = cy + (R-10)*Math.sin(a*Math.PI/180)
        const ox = cx + (R+2) *Math.cos(a*Math.PI/180), oy = cy + (R+2) *Math.sin(a*Math.PI/180)
        return <line key={deg} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(255,255,255,.12)" strokeWidth="2" strokeLinecap="round"/>
      })}
    </svg>
  )
}

function ThresholdForm({ bridgeId, current, onDone }) {
  const [val,  setVal]  = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const n = parseInt(val, 10)
    if (!n || n <= 0) return setErr('Enter a positive number')
    setBusy(true); setErr('')
    try { await api.setThreshold(bridgeId, n); setVal(''); onDone() }
    catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid var(--color-border)' }}>
      <p style={{ marginBottom:8, fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-t3)' }}>
        Alert threshold
      </p>
      <form onSubmit={submit} style={{ display:'flex', gap:8 }}>
        <input
          type="number" min="1" value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={`Current: ${current ?? '—'}`}
          style={{
            flex:1, minWidth:0, borderRadius:8,
            padding:'8px 12px', fontFamily:'var(--font-mono)', fontSize:13,
            background:'var(--color-bg)', color:'var(--color-t1)',
            border:'1px solid var(--color-border)', outline:'none',
            transition:'border-color .15s',
          }}
          onFocus={e  => e.target.style.borderColor='var(--color-teal)'}
          onBlur={e   => e.target.style.borderColor='var(--color-border)'}
        />
        <button type="submit" disabled={busy} style={{
          padding:'8px 16px', borderRadius:8, border:'none',
          background:'var(--color-teal)', color:'var(--color-bg)',
          fontSize:12, fontWeight:700, cursor:'pointer',
          opacity: busy ? .5 : 1, transition:'opacity .15s, transform .1s',
        }}
          onMouseDown={e => e.currentTarget.style.transform='scale(.96)'}
          onMouseUp={e   => e.currentTarget.style.transform='scale(1)'}
        >
          {busy ? '…' : 'Set'}
        </button>
      </form>
      {err && <p style={{ marginTop:6, fontSize:11, color:'var(--color-red)' }}>{err}</p>}
    </div>
  )
}

export default function OccupancyCard({ occupancy, bridgeId, onRefresh }) {
  const occ = occupancy?.occupancy ?? 0
  const thr = occupancy?.threshold ?? 40
  const { pct, color, label } = getStatus(occ, thr)
  const c = PALETTE[color]

  const badgeStyle = {
    teal:  { background:'rgba(0,229,204,.1)',  color:'var(--color-teal)',  border:'1px solid rgba(0,229,204,.25)'  },
    amber: { background:'rgba(255,181,71,.1)', color:'var(--color-amber)', border:'1px solid rgba(255,181,71,.25)' },
    red:   { background:'rgba(255,82,82,.1)',  color:'var(--color-red)',   border:'1px solid rgba(255,82,82,.25)'  },
    green: { background:'rgba(63,185,80,.1)',  color:'var(--color-green)', border:'1px solid rgba(63,185,80,.25)'  },
  }[color]

  return (
    <div style={{
      borderRadius:16,
      padding:20,
      background:'var(--color-panel)',
      border:'1px solid var(--color-border)',
      display:'flex', flexDirection:'column',
      animation:'fade-up .3s ease',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-t3)' }}>
          Current Occupancy
        </span>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, borderRadius:999, padding:'3px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', ...badgeStyle }}>
          {color === 'red' && (
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
          )}
          {label}
        </span>
      </div>

      {/* Ring + overlaid number */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <GaugeRing pct={pct} color={color} />
        {/* Overlay number in centre */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          pointerEvents:'none',
        }}>
          <span style={{
            fontFamily:'var(--font-mono)', fontWeight:900, lineHeight:1,
            fontSize:'clamp(2rem,5vw,3.5rem)',
            color: c, textShadow:`0 0 28px ${c}66`,
            transition:'color .5s, text-shadow .5s',
          }}>
            {occupancy ? occ : '—'}
          </span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--color-t3)', marginTop:4 }}>
            / {thr}
          </span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:c, marginTop:2 }}>
            {Math.round(pct)}%{occ > thr ? ' ⚠' : ''}
          </span>
        </div>
      </div>

      {/* Fill bar */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-t3)', marginBottom:6 }}>
          <span>capacity utilization</span>
          <span style={{ color:c }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height:6, borderRadius:3, background:'var(--color-bg)', overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:3,
            width:`${pct}%`,
            background:`linear-gradient(90deg,${c}70,${c})`,
            boxShadow:`0 0 10px ${c}55`,
            transition:'width .7s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
        {occ > thr && (
          <p style={{ marginTop:8, fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:'var(--color-red)', textAlign:'center' }}>
            +{occ - thr} people over limit
          </p>
        )}
      </div>

      <ThresholdForm bridgeId={bridgeId} current={thr} onDone={onRefresh} />
    </div>
  )
}
