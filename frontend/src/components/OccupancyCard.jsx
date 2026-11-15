import { useState } from 'react'
import { getStatus, COLOR } from '../lib/utils.js'
import { api } from '../lib/api.js'

/** Circular SVG ring gauge — ratio clamped 0..1 for arc length */
function Ring({ ratio, color, occ, thr }) {
  const R   = 54
  const cx  = 68, cy = 68
  const circ = 2 * Math.PI * R
  const clampedRatio = Math.min(ratio, 1)
  const col = COLOR[color]

  // 270° arc starting at 135°
  const arcPct  = 0.75
  const trackLen = circ * arcPct
  const fillLen  = trackLen * clampedRatio

  const polar = (deg) => ({
    x: cx + R * Math.cos((deg * Math.PI) / 180),
    y: cy + R * Math.sin((deg * Math.PI) / 180),
  })

  const arc = (startDeg, sweep) => {
    const s = polar(startDeg)
    const e = polar(startDeg + sweep)
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
  }

  return (
    <svg viewBox="0 0 136 136" className="w-full">
      {/* Track */}
      <path d={arc(135, 270)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" strokeLinecap="round" />
      {/* Fill */}
      <path
        d={arc(135, 270 * clampedRatio)}
        fill="none"
        stroke={col.fill}
        strokeWidth="10"
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 6px ${col.glow})`,
          transition: 'all 0.7s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      {/* Centre: big number */}
      <text x={cx} y={cy - 8} textAnchor="middle"
        fill={ratio >= 1 ? col.fill : 'var(--color-text-1)'}
        fontSize="26" fontFamily="'Geist Mono',monospace" fontWeight="800"
        style={{ transition: 'fill .4s' }}
      >
        {occ ?? '—'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        fill="var(--color-text-3)" fontSize="10" fontFamily="'Geist Mono',monospace"
      >
        of {thr ?? '—'}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle"
        fill={col.fill} fontSize="9" fontFamily="'Geist Mono',monospace" fontWeight="600"
      >
        {Math.round(clampedRatio * 100)}%{ratio > 1 ? ' ⚠' : ''}
      </text>
    </svg>
  )
}

function ThresholdForm({ bridgeId, current, onDone }) {
  const [val, setVal]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

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
    <form onSubmit={submit} className="mt-5 border-t border-[var(--color-border)] pt-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-3)]">
        Alert threshold
      </p>
      <div className="flex gap-2">
        <input
          type="number" min="1" value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={`Current: ${current ?? '—'}`}
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 font-mono text-sm text-[var(--color-text-1)] placeholder-[var(--color-text-3)] outline-none focus:border-[var(--color-teal)]/60 focus:ring-1 focus:ring-[var(--color-teal)]/15 transition"
        />
        <button
          type="submit" disabled={busy}
          className="rounded-lg bg-[var(--color-teal)] px-4 py-2 text-xs font-bold text-[var(--color-bg)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
          {busy ? '…' : 'Set'}
        </button>
      </div>
      {err && <p className="mt-1.5 text-[11px] text-[var(--color-red)]">{err}</p>}
    </form>
  )
}

export default function OccupancyCard({ occupancy, bridgeId, onRefresh }) {
  const occ  = occupancy?.occupancy  ?? 0
  const thr  = occupancy?.threshold  ?? 40
  const { label, color, ratio } = getStatus(occ, thr)
  const col  = COLOR[color]

  const badgeCls = {
    teal:  'bg-[var(--color-teal)]/10  text-[var(--color-teal)]  ring-1 ring-[var(--color-teal)]/25',
    amber: 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] ring-1 ring-[var(--color-amber)]/25',
    red:   'bg-[var(--color-red)]/10   text-[var(--color-red)]   ring-1 ring-[var(--color-red)]/25',
    blue:  'bg-[var(--color-blue)]/10  text-[var(--color-blue)]  ring-1 ring-[var(--color-blue)]/25',
  }[color]

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-3)]">
          Current Occupancy
        </h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}>
          {color === 'red' && (
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-red)]" style={{ animation: 'pulse-red 1.5s ease-in-out infinite' }} />
          )}
          {label}
        </span>
      </div>

      {/* Ring + details side by side */}
      <div className="flex items-center gap-6">
        {/* Ring gauge */}
        <div className="w-32 shrink-0">
          <Ring ratio={ratio} color={color} occ={occ} thr={thr} />
        </div>

        {/* Detail column */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Big occupancy number */}
          <div>
            <div className="font-mono text-5xl font-black leading-none"
              style={{ color: col.fill, textShadow: `0 0 24px ${col.glow}`, transition: 'color .5s, text-shadow .5s' }}
            >
              {occupancy ? occ : '—'}
            </div>
            <div className="mt-1.5 font-mono text-xs text-[var(--color-text-3)]">
              / {thr} max capacity
            </div>
          </div>

          {/* Fill bar */}
          <div>
            <div className="mb-1.5 flex justify-between font-mono text-[10px] text-[var(--color-text-3)]">
              <span>utilization</span>
              <span style={{ color: col.fill }}>{Math.round(Math.min(ratio, 1) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-1)]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(ratio, 1) * 100}%`,
                  background: `linear-gradient(90deg, ${col.fill}80, ${col.fill})`,
                  boxShadow: `0 0 10px ${col.glow}`,
                }}
              />
            </div>
          </div>

          {/* Over-threshold callout */}
          {ratio >= 1 && (
            <div className="rounded-lg border border-[var(--color-red)]/25 bg-[var(--color-red)]/8 px-3 py-2">
              <p className="font-mono text-xs font-semibold text-[var(--color-red)]">
                +{occ - thr} over limit
              </p>
            </div>
          )}
        </div>
      </div>

      <ThresholdForm bridgeId={bridgeId} current={thr} onDone={onRefresh} />
    </div>
  )
}
