import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fmtTime } from '../lib/utils.js'
import { api } from '../lib/api.js'

const WINDOWS = [
  { label: '1h',  hours: 1,  mins: 5  },
  { label: '2h',  hours: 2,  mins: 5  },
  { label: '6h',  hours: 6,  mins: 15 },
  { label: '24h', hours: 24, mins: 60 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-navy-400/60 bg-navy-700/95 p-3 text-xs shadow-xl backdrop-blur-sm">
      <p className="mb-2 font-mono text-slate-dim">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-muted">{p.name}:</span>
          <span className="font-mono font-bold" style={{ color: p.fill }}>{p.value}</span>
        </div>
      ))}
      <div className="mt-1.5 border-t border-navy-400/40 pt-1.5">
        <span className="text-slate-dim">net: </span>
        <span className="font-mono font-bold text-slate-text">
          {(payload.find(p => p.name === 'In')?.value ?? 0) - (payload.find(p => p.name === 'Out')?.value ?? 0) >= 0 ? '+' : ''}
          {(payload.find(p => p.name === 'In')?.value ?? 0) - (payload.find(p => p.name === 'Out')?.value ?? 0)}
        </span>
      </div>
    </div>
  )
}

export default function FootfallChart({ bridgeId }) {
  const [win, setWin]   = useState(WINDOWS[1])
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getFootfall(bridgeId, win.mins, win.hours)
      .then(res => {
        const rows = (res.buckets ?? []).map(b => ({
          time: fmtTime(b.bucket_start),
          In:   b.in,
          Out:  b.out,
        }))
        setData(rows)
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [bridgeId, win])

  const isEmpty = !loading && data.length === 0

  return (
    <div className="rounded-2xl border border-navy-400/50 bg-navy-700/60 p-5 backdrop-blur-sm [animation:var(--animate-fade-up)]">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-dim">Footfall Trend</h2>
          <p className="mt-0.5 text-[11px] text-slate-dim/60 font-mono">
            {win.mins}-min buckets · last {win.label}
          </p>
        </div>
        {/* Window picker */}
        <div className="flex gap-1 rounded-lg border border-navy-400/40 bg-navy-800/60 p-1">
          {WINDOWS.map(w => (
            <button
              key={w.label}
              onClick={() => setWin(w)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                w.label === win.label
                  ? 'bg-teal-500 text-navy-900 shadow'
                  : 'text-slate-dim hover:text-slate-muted'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-56">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-slate-dim [animation:var(--animate-blink)]">Loading…</span>
          </div>
        )}
        {isEmpty && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-2xl opacity-20">📊</span>
            <span className="text-xs text-slate-dim">No crossings recorded in this window</span>
          </div>
        )}
        {!loading && !isEmpty && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" barGap={2}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#5d7a94', fontSize: 10, fontFamily: 'Geist Mono,monospace' }}
                axisLine={false} tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#5d7a94', fontSize: 10, fontFamily: 'Geist Mono,monospace' }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#9eb3c8', paddingTop: 10 }}
                iconType="circle" iconSize={8}
              />
              <Bar dataKey="In"  fill="#2fd4c0" radius={[3,3,0,0]}
                style={{ filter: 'drop-shadow(0 0 4px rgba(47,212,192,.4))' }} />
              <Bar dataKey="Out" fill="#3d5570" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
