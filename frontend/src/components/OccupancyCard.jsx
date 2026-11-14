import { useState } from 'react'
import { pct, occupancyColor, occupancyLabel } from '../lib/utils.js'
import { api } from '../lib/api.js'

/* ── SVG circular arc gauge ── */
function ArcGauge({ ratio }) {
  const R = 72
  const cx = 90, cy = 90
  const circumference = 2 * Math.PI * R
  // We draw a 270° arc (from 135° to 45°), swept clockwise
  const arcLen  = circumference * 0.75
  const filled  = arcLen * Math.min(ratio, 1)
  const col     = occupancyColor(ratio)

  // Start/end of the arc in SVG coords (135° = bottom-left, 270° sweep)
  const toXY = (deg) => ({
    x: cx + R * Math.cos((deg * Math.PI) / 180),
    y: cy + R * Math.sin((deg * Math.PI) / 180),
  })
  const start = toXY(135)
  const end   = toXY(405) // 135+270

  const describeArc = (startDeg, sweepDeg) => {
    const s = toXY(startDeg)
    const e = toXY(startDeg + sweepDeg)
    const large = sweepDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`
  }

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px] drop-shadow-lg">
      {/* Track */}
      <path
        d={describeArc(135, 270)}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={describeArc(135, 270 * Math.min(ratio, 1))}
        fill="none"
        stroke={col.bar}
        strokeWidth="12"
        strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 8px ${col.glow})`,
          transition: 'all 0.6s cubic-bezier(.4,0,.2,1)',
        }}
      />
      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const deg = 135 + 270 * t
        const inner = toXY_r(cx, cy, R - 10, deg)
        const outer = toXY_r(cx, cy, R + 2,  deg)
        return (
          <line key={t}
            x1={inner.x} y1={inner.y}
            x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round"
          />
        )
      })}
      {/* Centre text */}
      <text x={cx} y={cy - 6} textAnchor="middle"
        fill={col.text}
        fontSize="34" fontFamily="'Geist Mono',monospace" fontWeight="700"
        style={{ transition: 'fill 0.4s' }}
      >
        {Math.round(ratio * 100)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        fill="rgba(158,179,200,0.7)" fontSize="11" fontFamily="'Geist Mono',monospace"
      >
        % capacity
      </text>
    </svg>
  )
}
function toXY_r(cx, cy, r, deg) {
  return { x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy + r * Math.sin((deg * Math.PI) / 180) }
}

/* ── Threshold editor ── */
function ThresholdEditor({ bridgeId, current, onDone }) {
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const n = parseInt(val, 10)
    if (!n || n <= 0) return setErr('Enter a positive integer')
    setSaving(true); setErr('')
    try {
      await api.setThreshold(bridgeId, n)
      setVal('')
      onDone()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-dim">
        Alert threshold
      </label>
      <div className="flex gap-2">
        <input
          type="number" min="1"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={`Current: ${current ?? '—'}`}
          className="flex-1 min-w-0 rounded-lg border border-navy-400/60 bg-navy-800/80 px-3 py-2 font-mono text-sm text-slate-text placeholder-slate-dim/60 outline-none focus:border-teal-500/70 focus:ring-1 focus:ring-teal-500/20 transition-colors"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-navy-900 hover:bg-teal-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? '…' : 'Set'}
        </button>
      </div>
      {err && <p className="mt-1 text-[11px] text-crimson-400">{err}</p>}
    </form>
  )
}

/* ── Main card ── */
export default function OccupancyCard({ occupancy, bridgeId, onThresholdChange }) {
  const occ  = occupancy?.occupancy  ?? 0
  const thr  = occupancy?.threshold  ?? 40
  const ratio = occ / Math.max(1, thr)
  const col  = occupancyColor(ratio)
  const lbl  = occupancyLabel(ratio)

  return (
    <div className="rounded-2xl border border-navy-400/50 bg-navy-700/60 p-5 backdrop-blur-sm [animation:var(--animate-fade-up)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-dim">
          Current Occupancy
        </h2>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lbl.cls}`}>
          {occupancy?.alert_active && (
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-crimson-400 [animation:var(--animate-pulse-red)]" />
          )}
          {lbl.label}
        </span>
      </div>

      {/* Gauge + big numbers side by side */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-[130px]">
          <ArcGauge ratio={ratio} />
        </div>

        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Count */}
          <div>
            <div className="font-mono text-5xl font-black leading-none" style={{ color: col.text, textShadow: `0 0 20px ${col.glow}`, transition: 'color 0.5s, text-shadow 0.5s' }}>
              {occupancy ? occ : '—'}
            </div>
            <div className="mt-1 font-mono text-xs text-slate-dim">
              / {thr} threshold
            </div>
          </div>

          {/* Linear bar */}
          <div className="h-1.5 w-full rounded-full bg-navy-500/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct(occ, thr)}%`,
                background: `linear-gradient(90deg, ${col.bar}99, ${col.bar})`,
                boxShadow: `0 0 8px ${col.glow}`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Threshold editor */}
      <ThresholdEditor
        bridgeId={bridgeId}
        current={thr}
        onDone={onThresholdChange}
      />
    </div>
  )
}
