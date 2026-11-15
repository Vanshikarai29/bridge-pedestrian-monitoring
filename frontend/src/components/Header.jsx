import { fmtTime } from '../lib/utils.js'

export default function Header({ status, lastUpdated, bridgeId, bridges, onBridgeChange, onRefresh, onReset }) {
  const isOk  = status === 'ok'
  const isErr = status === 'err'

  const allBridges = [...new Set(['bridge-1', ...(bridges ?? []).map(b => b.bridge_id), bridgeId])]

  return (
    <header style={{ background: 'var(--color-panel)', borderBottom: '1px solid var(--color-border)' }}
      className="sticky top-0 z-50">
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-4 px-5">

        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg,var(--color-teal),var(--color-teal-2))' }}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="var(--color-bg)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 5h14M1 5v7M15 5v7M1 12h14M5 5v7M11 5v7"/>
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color:'var(--color-t1)' }}>Bridge Monitor</span>
        </div>

        {/* Bridge chips */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {allBridges.map(id => {
            const isActive = id === bridgeId
            const hasAlert = (bridges ?? []).find(b => b.bridge_id === id)?.alert_active
            return (
              <button key={id} onClick={() => onBridgeChange(id)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all"
                style={isActive ? {
                  background: 'rgba(0,229,204,.12)',
                  color: 'var(--color-teal)',
                  outline: '1px solid rgba(0,229,204,.3)',
                } : {
                  color: 'var(--color-t3)',
                  background: 'transparent',
                }}>
                {hasAlert && <span className="h-1.5 w-1.5 rounded-full" style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />}
                {id}
              </button>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          {lastUpdated && (
            <span className="hidden font-mono text-[11px] lg:block" style={{ color:'var(--color-t3)' }}>
              {fmtTime(lastUpdated)}
            </span>
          )}

          {/* Status */}
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background:'var(--color-panel-2)', outline:'1px solid var(--color-border)' }}>
            <span className="h-1.5 w-1.5 rounded-full"
              style={{
                background: isOk ? 'var(--color-teal)' : isErr ? 'var(--color-red)' : 'var(--color-amber)',
                animation:  isOk ? 'pulse-teal 2s infinite' : isErr ? 'pulse-red 1.4s infinite' : 'blink-dot 1.2s infinite',
              }} />
            <span className="text-[11px] font-semibold"
              style={{ color: isOk ? 'var(--color-teal)' : isErr ? 'var(--color-red)' : 'var(--color-amber)' }}>
              {isOk ? 'Live' : isErr ? 'Offline' : 'Connecting'}
            </span>
          </div>

          <button onClick={onRefresh}
            className="rounded-md px-3 py-1 text-xs font-medium transition-all"
            style={{ background:'var(--color-panel-2)', color:'var(--color-t2)', outline:'1px solid var(--color-border)' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--color-t1)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--color-t2)'}>
            ↻ Refresh
          </button>
          <button onClick={onReset}
            className="rounded-md px-3 py-1 text-xs font-medium transition-all"
            style={{ background:'var(--color-panel-2)', color:'var(--color-t3)', outline:'1px solid var(--color-border)' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--color-red)'; e.currentTarget.style.outlineColor='rgba(255,82,82,.4)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--color-t3)'; e.currentTarget.style.outlineColor='var(--color-border)' }}>
            Reset
          </button>
        </div>
      </div>
    </header>
  )
}
