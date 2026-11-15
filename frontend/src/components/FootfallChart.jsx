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
    <div style={{ background:'var(--color-panel-3)', border:'1px solid var(--color-border-2)', borderRadius:10, padding:'10px 12px', fontSize:12, minWidth:110 }}>
      <p style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--color-t3)', marginBottom:8 }}>{label}</p>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16 }}>
          <span style={{ color:'var(--color-t2)' }}>In</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--color-teal)' }}>{inV}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16 }}>
          <span style={{ color:'var(--color-t2)' }}>Out</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--color-t2)' }}>{outV}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16, borderTop:'1px solid var(--color-border)', paddingTop:6, marginTop:2 }}>
          <span style={{ color:'var(--color-t3)' }}>Net</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: inV-outV>=0 ? 'var(--color-teal)' : 'var(--color-amber)' }}>
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
    <div style={{
      borderRadius:16, padding:20,
      background:'var(--color-panel)', border:'1px solid var(--color-border)',
      display:'flex', flexDirection:'column',
      animation:'fade-up .4s ease',
    }}>
      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20 }}>
        <div>
          <p style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--color-t3)' }}>
            Footfall Trend
          </p>
          <p style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--color-t3)', opacity:.6, marginTop:2 }}>
            {win.mins}-min buckets · last {win.label}
          </p>
        </div>
        {/* Window tabs */}
        <div style={{ display:'flex', gap:2, background:'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:8, padding:3 }}>
          {WINDOWS.map(w => (
            <button key={w.label} onClick={() => setWin(w)}
              style={{
                padding:'4px 12px', borderRadius:6, border:'none',
                fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s',
                background: w.label===win.label ? 'var(--color-teal)' : 'transparent',
                color:       w.label===win.label ? 'var(--color-bg)'  : 'var(--color-t3)',
              }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart fills remaining space */}
      <div style={{ flex:1, minHeight:200, position:'relative' }}>
        {busy && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--color-t3)', animation:'blink-dot 1.2s infinite' }}>Loading…</span>
          </div>
        )}
        {!busy && !hasData && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
            <div style={{ fontSize:36, opacity:.1 }}>📊</div>
            <p style={{ fontSize:14, fontWeight:500, color:'var(--color-t2)' }}>No crossings recorded</p>
            <p style={{ fontSize:12, color:'var(--color-t3)' }}>Run the detection pipeline to generate data</p>
          </div>
        )}
        {hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barCategoryGap="38%" barGap={2} margin={{ top:4, right:0, left:-20, bottom:0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} interval="preserveStartEnd"
                tick={{ fill:'var(--color-t3)', fontSize:10, fontFamily:'var(--font-mono)' }} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={28}
                tick={{ fill:'var(--color-t3)', fontSize:10, fontFamily:'var(--font-mono)' }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:'rgba(255,255,255,0.025)', radius:4 }} />
              <Legend wrapperStyle={{ fontSize:11, color:'var(--color-t2)', paddingTop:14 }}
                iconType="circle" iconSize={6} />
              <Bar dataKey="In"  fill="var(--color-teal)" radius={[3,3,0,0]}
                style={{ filter:'drop-shadow(0 0 6px rgba(0,229,204,.4))' }} />
              <Bar dataKey="Out" fill="#2a4d6b" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
