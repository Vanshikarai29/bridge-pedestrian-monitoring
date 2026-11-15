import { fmtTime } from '../lib/utils.js'

export default function Header({ status, lastUpdated, bridgeId, bridges, onBridgeChange, onRefresh, onReset }) {
  const dot = {
    ok:         'bg-teal-500',
    err:        'bg-red-500',
    connecting: 'bg-amber-500',
  }[status] ?? 'bg-amber-500'

  const label = { ok: 'Live', err: 'Offline', connecting: 'Connecting' }[status] ?? 'Connecting'

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-6 px-6">

        {/* Left: brand + bridge tabs */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo mark */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-teal)] to-[var(--color-teal-dim)]">
              <svg className="h-4 w-4 text-[var(--color-bg)]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6h16v2H2zM2 6v8h2V6zM16 6v8h2V6zM2 14h16v2H2z"/>
                <circle cx="10" cy="10" r="2"/>
              </svg>
            </div>
            <span className="hidden text-sm font-semibold text-[var(--color-text-1)] sm:block">
              Bridge Monitor
            </span>
          </div>

          {/* Bridge selector chips */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
            {[...new Set(['bridge-1', ...(bridges ?? []).map(b => b.bridge_id), bridgeId])].map(id => (
              <button
                key={id}
                onClick={() => onBridgeChange(id)}
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  id === bridgeId
                    ? 'bg-[var(--color-teal)]/15 text-[var(--color-teal)] ring-1 ring-[var(--color-teal)]/30'
                    : 'text-[var(--color-text-2)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-1)]'
                }`}
              >
                {id}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: timestamp + status + actions */}
        <div className="flex shrink-0 items-center gap-3">
          {lastUpdated && (
            <span className="hidden font-mono text-[11px] text-[var(--color-text-3)] lg:block">
              {fmtTime(lastUpdated)}
            </span>
          )}

          {/* Status pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === 'ok' ? '[animation:pulse-teal_2s_ease-in-out_infinite]' : ''}`} />
            <span className={`text-[11px] font-semibold ${status === 'ok' ? 'text-[var(--color-teal)]' : status === 'err' ? 'text-[var(--color-red)]' : 'text-[var(--color-amber)]'}`}>
              {label}
            </span>
          </div>

          <button onClick={onRefresh} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-2)] transition hover:border-[var(--color-border-2)] hover:text-[var(--color-text-1)]">
            ↻ Refresh
          </button>
          <button onClick={onReset} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-2)] transition hover:border-[var(--color-red)]/40 hover:text-[var(--color-red)]">
            Reset
          </button>
        </div>
      </div>
    </header>
  )
}
