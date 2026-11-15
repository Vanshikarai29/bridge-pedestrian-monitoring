import { useState } from 'react'
import { getStatus, PALETTE } from '../lib/utils.js'
import { api } from '../lib/api.js'

/** Full-circle SVG ring, capped at 100% */
function GaugeRing({ pct, color }) {
  const c   = PALETTE[color] ?? PALETTE.teal
  const R   = 80
  const cx  = 100, cy = 100
  const circ = 2 * Math.PI * R
  const fill = circ * (pct / 100)
  // Start at top (-90°)
  const startAngle = -90
  const toXY = (deg) => ({
    x: cx + R * Math.cos((deg * Math.PI) / 180),
    y: cy + R * Math.sin((deg * Math.PI) / 180),
  })
  const sweepDeg = (pct / 100) * 360
  const endAngle = startAngle + sweepDeg
  const s = toXY(startAngle)
  const e = toXY(endAngle)
  const largeArc = sweepDeg > 180 ? 1 : 0
  const arcPath  = `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
      {/* Background track */}
      <circle cx={cx} cy={cy} r={R} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth="12" />

      {/* Filled arc */}
      {pct > 0 && pct < 100 && (
        <path d={arcPath} fill="none" stroke={c} strokeWidth="12" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 10px ${c}88)`, transition:'all .8s cubic-bezier(.4,0,.2,1)' }} />
      )}
      {/* Full circle when at/over 100% */}
      {pct >= 100 && (
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={c} strokeWidth="12"
          style={{ filter:`drop-shadow(0 0 12px ${c}99)` }} />
      )}

      {/* Tick marks at 25% intervals */}
      {[0, 90, 180, 270].map(deg => {
        const inner = toXY_r(cx, cy, R - 10, deg - 90)
        const outer = toXY_r(cx, cy, R + 2,  deg - 90)
        return <line key={deg} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
          stroke="rgba(255,255,255,.1)" strokeWidth="1.5" strokeLinecap="round" />
      })}
    </svg>
  )
}
function toXY_r(cx, cy, r, deg) {
  return { x: cx + r * Math.cos((deg * Math.PI)/180), y: cy + r * Math.sin((deg * Math.PI)/180) }
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
    <div className="mt-6 rounded-xl p-4" style={{ background:'var(--color-panel-2)', outline:'1px solid var(--color-border)' }}>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color:'var(--color-t3)' }}>
        Set alert threshold
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <input type="number" min="1" value={val} onChange={e => setVal(e.target.value)}
          placeholder={`Current: ${current ?? '—'}`}
          className="flex-1 min-w-0 rounded-lg px-3 py-2 font-mono text-sm outline-none transition"
          style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)', color:'var(--color-t1)' }}
          onFocus={e  => e.target.style.borderColor = 'var(--color-teal)'}
          onBlur={e   => e.target.style.borderColor = 'var(--color-border)'}
        />
        <button type="submit" disabled={busy}
          className="rounded-lg px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50"
          style={{ background:'var(--color-teal)', color:'var(--color-bg)' }}>
          {busy ? '…' : 'Set'}
        </button>
      </form>
      {err && <p className="mt-1.5 text-[11px]" style={{ color:'var(--color-red)' }}>{err}</p>}
    </div>
  )
}

export default function OccupancyCard({ occupancy, bridgeId, onRefresh }) {
  const occ = occupancy?.occupancy ?? 0
  const thr = occupancy?.threshold ?? 40
  const { pct, color, label } = getStatus(occ, thr)
  const c   = PALETTE[color]

  const badgeStyle = {
    teal:  { background:'rgba(0,229,204,.1)',   color:'var(--color-teal)',  outline:'1px solid rgba(0,229,204,.25)'   },
    amber: { background:'rgba(255,181,71,.1)',  color:'var(--color-amber)', outline:'1px solid rgba(255,181,71,.25)'  },
    red:   { background:'rgba(255,82,82,.1)',   color:'var(--color-red)',   outline:'1px solid rgba(255,82,82,.25)'   },
    green: { background:'rgba(63,185,80,.1)',   color:'var(--color-green)', outline:'1px solid rgba(63,185,80,.25)'   },
  }[color]

  return (
    <div className="rounded-2xl p-6" style={{ background:'var(--color-panel)', outline:'1px solid var(--color-border)', animation:'fade-up .3s ease' }}>

      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--color-t3)' }}>
          Current Occupancy
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={badgeStyle}>
          {color === 'red' && (
            <span className="h-1.5 w-1.5 rounded-full" style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
          )}
          {label}
        </span>
      </div>

      {/* Gauge + number */}
      <div className="relative flex flex-col items-center">
        <GaugeRing pct={pct} color={color} />

        {/* Overlay the numbers in the centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-black leading-none"
            style={{ fontSize:'clamp(2.5rem,6vw,4rem)', color: c, textShadow:`0 0 30px ${c}66`, transition:'color .5s, text-shadow .5s' }}>
            {occupancy ? occ : '—'}
          </span>
          <span className="mt-1 font-mono text-sm" style={{ color:'var(--color-t3)' }}>
            / {thr}
          </span>
          <span className="mt-0.5 font-mono text-xs font-semibold" style={{ color: c }}>
            {Math.round(pct)}%{occ > thr ? ' ⚠' : ''}
          </span>
        </div>
      </div>

      {/* Fill bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] font-mono" style={{ color:'var(--color-t3)' }}>
          <span>capacity utilization</span>
          <span style={{ color: c }}>{Math.round(pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background:'var(--color-bg)' }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width:`${pct}%`, background:`linear-gradient(90deg,${c}80,${c})`, boxShadow:`0 0 12px ${c}55` }} />
        </div>
        {occ > thr && (
          <div className="mt-2 text-center font-mono text-xs font-bold" style={{ color:'var(--color-red)' }}>
            +{occ - thr} people over limit
          </div>
        )}
      </div>

      <ThresholdForm bridgeId={bridgeId} current={thr} onDone={onRefresh} />
    </div>
  )
}
