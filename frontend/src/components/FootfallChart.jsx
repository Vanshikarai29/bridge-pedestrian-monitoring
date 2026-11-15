import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmtTime } from '../lib/utils.js'
import { api } from '../lib/api.js'

const WINDOWS = [
  { label:'1h',  hours:1,  mins:5  },
  { label:'2h',  hours:2,  mins:5  },
  { label:'6h',  hours:6,  mins:15 },
  { label:'24h', hours:24, mins:60 },
]

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const inV  = payload.find(p => p.dataKey==='In')?.value  ?? 0
  const outV = payload.find(p => p.dataKey==='Out')?.value ?? 0
  return (
    <div className="rounded-xl p-3 text-xs shadow-2xl"
      style={{ background:'var(--color-panel-3)', outline:'1px solid var(--color-border-2)', minWidth:120 }}>
      <p className="mb-2 font-mono" style={{ color:'var(--color-t3)' }}>{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color:'var(--color-t2)' }}>In</span>
          <span className="font-mono font-bold" style={{ color:'var(--color-teal)' }}>{inV}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color:'var(--color-t2)' }}>Out</span>
          <span className="font-mono font-bold" style={{ color:'var(--color-t2)' }}>{outV}</span>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1" style={{ borderColor:'var(--color-border)' }}>
          <span style={{ color:'var(--color-t3)' }}>Net</span>
          <span className="font-mono font-bold" style={{ color: inV-outV>=0 ? 'var(--color-teal)' : 'var(--color-amber)' }}>
            {inV-outV>=0?'+':''}{inV-outV}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function FootfallChart({ bridgeId }) {
  const [win,  setWin]  = useState(WINDOWS[1])
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)

  const load = useCallback(() => {
    setBusy(true)
    api.getFootfall(bridgeId, win.mins, win.hours)
      .then(r => setRows((r.buckets ?? []).map(b => ({ time: fmtTime(b.bucket_start), In: b.in, Out: b.out }))))
      .catch(() => setRows([]))
      .finally(() => setBusy(false))
  }, [bridgeId, win])

  useEffect(() => { load() }, [load])

  const hasData = !busy && rows.length > 0

  return (
    <div className="rounded-2xl p-6" style={{ background:'var(--color-panel)', outline:'1px solid var(--color-border)', animation:'fade-up .4s ease' }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--color-t3)' }}>
            Footfall Trend
          </h2>
          <p className="mt-0.5 font-mono text-[11px]" style={{ color:'var(--color-t3)', opacity:.6 }}>
            {win.mins}-min buckets · last {win.label}
          </p>
        </div>

        {/* Window switcher */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background:'var(--color-bg)', outline:'1px solid var(--color-border)' }}>
          {WINDOWS.map(w => (
            <button key={w.label} onClick={() => setWin(w)}
              className="rounded-md px-3 py-1 text-xs font-semibold transition-all"
              style={w.label===win.label ? {
                background:'var(--color-teal)', color:'var(--color-bg)',
              } : {
                color:'var(--color-t3)',
              }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs" style={{ color:'var(--color-t3)', animation:'blink-dot 1.2s infinite' }}>Loading…</span>
          </div>
        )}
        {!busy && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-4xl opacity-10">📊</div>
            <p className="text-sm font-medium" style={{ color:'var(--color-t2)' }}>No crossings recorded</p>
            <p className="text-xs" style={{ color:'var(--color-t3)' }}>Run the detection pipeline to generate data</p>
          </div>
        )}
        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barCategoryGap="38%" barGap={2}
              margin={{ top:4, right:0, left:-20, bottom:0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} interval="preserveStartEnd"
                tick={{ fill:'var(--color-t3)', fontSize:10, fontFamily:'JetBrains Mono,monospace' }} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={28}
                tick={{ fill:'var(--color-t3)', fontSize:10, fontFamily:'JetBrains Mono,monospace' }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.025)', radius:4 }} />
              <Legend wrapperStyle={{ fontSize:11, color:'var(--color-t2)', paddingTop:14 }}
                iconType="circle" iconSize={6} />
              <Bar dataKey="In"  fill="var(--color-teal)" radius={[3,3,0,0]}
                style={{ filter:'drop-shadow(0 0 6px rgba(0,229,204,.4))' }} />
              <Bar dataKey="Out" fill="var(--color-border-2)" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
