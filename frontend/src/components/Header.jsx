import { fmtTime } from '../lib/utils.js'

export default function Header({ status, lastUpdated, bridgeId, bridges, onBridgeChange, onRefresh, onReset }) {
  const isOk  = status === 'ok'
  const isErr = status === 'err'
  const dotColor  = isOk ? 'var(--color-teal)' : isErr ? 'var(--color-red)' : 'var(--color-amber)'
  const dotAnim   = isOk ? 'pulse-teal 2s infinite' : isErr ? 'pulse-red 1.4s infinite' : 'blink-dot 1.2s infinite'
  const statusTxt = isOk ? 'Live' : isErr ? 'Offline' : 'Connecting'

  const allBridges = [...new Set(['bridge-1', ...(bridges ?? []).map(b => b.bridge_id), bridgeId])]

  return (
    <header style={{
      position:'sticky', top:0, zIndex:50,
      height:48, display:'flex', alignItems:'center',
      padding:'0 16px', gap:16,
      background:'var(--color-panel)',
      borderBottom:'1px solid var(--color-border)',
    }}>

      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(135deg,var(--color-teal),var(--color-teal-2))',
        }}>
          <svg viewBox="0 0 16 16" style={{ width:15, height:15 }} fill="none"
            stroke="var(--color-bg)" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 5h14M1 5v7M15 5v7M1 12h14M5 5v7M11 5v7"/>
          </svg>
        </div>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--color-t1)', whiteSpace:'nowrap' }}>
          Bridge Monitor
        </span>
      </div>

      {/* Bridge chips — scrollable, fills remaining space */}
      <div style={{ display:'flex', alignItems:'center', gap:4, flex:1, overflowX:'auto', minWidth:0 }}>
        {allBridges.map(id => {
          const isActive = id === bridgeId
          const hasAlert = (bridges ?? []).find(b => b.bridge_id === id)?.alert_active
          return (
            <button key={id} onClick={() => onBridgeChange(id)}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'4px 12px', borderRadius:6, border:'none',
                fontSize:12, fontWeight:500, cursor:'pointer',
                whiteSpace:'nowrap', transition:'all .15s',
                background: isActive ? 'rgba(0,229,204,.12)' : 'transparent',
                color:       isActive ? 'var(--color-teal)'   : 'var(--color-t3)',
                outline:     isActive ? '1px solid rgba(0,229,204,.3)' : 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color='var(--color-t2)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color='var(--color-t3)' }}
            >
              {hasAlert && (
                <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
              )}
              {id}
            </button>
          )
        })}
      </div>

      {/* Right: timestamp + status + actions */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {lastUpdated && (
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--color-t3)', display:'none' }}
            className="lg-show">{fmtTime(lastUpdated)}</span>
        )}

        {/* Status pill */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'4px 10px', borderRadius:999,
          background:'var(--color-panel-2)', border:'1px solid var(--color-border)',
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:dotColor, animation:dotAnim }} />
          <span style={{ fontSize:11, fontWeight:600, color:dotColor }}>{statusTxt}</span>
        </div>

        <button onClick={onRefresh}
          style={{
            padding:'5px 12px', borderRadius:7, border:'1px solid var(--color-border)',
            background:'var(--color-panel-2)', color:'var(--color-t2)',
            fontSize:12, fontWeight:500, cursor:'pointer', transition:'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color='var(--color-t1)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--color-t2)'}
        >↻ Refresh</button>

        <button onClick={onReset}
          style={{
            padding:'5px 12px', borderRadius:7, border:'1px solid var(--color-border)',
            background:'var(--color-panel-2)', color:'var(--color-t3)',
            fontSize:12, fontWeight:500, cursor:'pointer', transition:'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color='var(--color-red)'; e.currentTarget.style.borderColor='rgba(255,82,82,.4)' }}
          onMouseLeave={e => { e.currentTarget.style.color='var(--color-t3)'; e.currentTarget.style.borderColor='var(--color-border)' }}
        >Reset</button>
      </div>
    </header>
  )
}
