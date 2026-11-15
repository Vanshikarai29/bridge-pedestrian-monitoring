import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { fmtTime } from '../lib/utils.js'
import { api } from '../lib/api.js'

const WINDOWS = [
  { label: '1h',  hours: 1,  mins: 5  },
  { label: '2h',  hours: 2,  mins: 5  },
  { label: '6h',  hours: 6,  mins: 15 },
  { label: '24h', hours: 24, mins: 60 },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const inVal  = payload.find(p => p.dataKey === 'In')?.value  ?? 0
  const outVal = payload.find(p => p.dataKey === 'Out')?.value ?? 0
  return (
    <div className="rounded-xl border border-[var(--color-border-2)] bg-[var(--color-surface-1)] p-3 shadow-2xl">
      <p className="mb-2 font-mono text-[11px] text-[var(--color-text-3)]">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-[var(--color-teal)]" />
          <span className="text-[var(--color-text-2)]">In:</span>
          <span className="font-mono font-bold text-[var(--color-teal)]">{inVal}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-[#3d5570]" />
          <span className="text-[var(--color-text-2)]">Out:</span>
          <span className="font-mono font-bold text-[var(--color-text-2)]">{outVal}</span>
        </div>
        <div className="mt-1.5 border-t border-[var(--color-border)] pt-1.5 text-xs">
          <span className="text-[var(--color-text-3)]">Net: </span>
          <span className={`font-mono font-bold ${inVal - outVal >= 0 ? 'text-[var(--color-teal)]' : 'text-[var(--color-amber)]'}`}>
            {inVal - outVal >= 0 ? '+' : ''}{inVal - outVal}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function FootfallChart({ bridgeId }) {
  const [win,     setWin]     = useState(WINDOWS[1])
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.getFootfall(bridgeId, win.mins, win.hours)
      .then(res => setRows((res.buckets ?? []).map(b => ({
        time: fmtTime(b.bucket_start),
        In:   b.in,
        Out:  b.out,
      }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [bridgeId, win])

  useEffect(() => { load() }, [load])

  const hasData = !loading && rows.length > 0

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-3)]">
            Footfall Trend
          </h2>
          <p className="mt-1 text-[11px] text-[var(--color-text-3)]/60 font-mono">
            {win.mins}-min buckets · last {win.label}
          </p>
        </div>
        {/* Window tabs */}
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-0.5">
          {WINDOWS.map(w => (
            <button
              key={w.label}
              onClick={() => setWin(w)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                w.label === win.label
                  ? 'bg-[var(--color-teal)] text-[var(--color-bg)] shadow'
                  : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-60">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-[var(--color-text-3)]">Loading…</span>
          </div>
        )}
        {!loading && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-3xl opacity-15">📊</div>
            <p className="text-sm font-medium text-[var(--color-text-3)]">No crossings recorded</p>
            <p className="text-[11px] text-[var(--color-text-3)]/60">
              Run the pipeline to generate data
            </p>
          </div>
        )}
        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barCategoryGap="35%" barGap={2} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--color-text-3)', fontSize: 10, fontFamily: 'Geist Mono,monospace' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--color-text-3)', fontSize: 10, fontFamily: 'Geist Mono,monospace' }}
                axisLine={false} tickLine={false}
                allowDecimals={false} width={28}
              />
              <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.025)', radius: 4 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--color-text-2)', paddingTop: 12 }}
                iconType="circle" iconSize={7}
              />
              <Bar dataKey="In"  fill="var(--color-teal)" radius={[3,3,0,0]}
                style={{ filter: 'drop-shadow(0 0 5px rgba(47,212,192,.35))' }} />
              <Bar dataKey="Out" fill="#3d5570"           radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
