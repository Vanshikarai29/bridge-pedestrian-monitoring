import { fmtTime } from '../lib/utils.js'

const statusConfig = {
  ok:         { dot: 'bg-teal-500 [animation:var(--animate-pulse-teal)]',   label: 'Live',         text: 'text-teal-500'   },
  err:        { dot: 'bg-crimson-400 [animation:var(--animate-pulse-red)]', label: 'Disconnected', text: 'text-crimson-400' },
  connecting: { dot: 'bg-amber-400 [animation:var(--animate-blink)]',       label: 'Connecting…',  text: 'text-amber-400'  },
}

export default function Header({ status, lastUpdated }) {
  const cfg = statusConfig[status] ?? statusConfig.connecting

  return (
    <header className="sticky top-0 z-50 border-b border-navy-400/40 bg-navy-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-screen-xl px-6 py-3 flex items-center justify-between gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-800/40">
            <svg className="h-5 w-5 text-navy-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 7v10M20 7v10M4 17h16"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M8 7v10M16 7v10"/>
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-text truncate">
              Bridge Occupancy Monitor
            </h1>
            <p className="text-[11px] text-slate-dim hidden sm:block">
              Live pedestrian counting &amp; crowd-density alerting
            </p>
          </div>
        </div>

        {/* Status cluster */}
        <div className="flex items-center gap-4 shrink-0">
          {lastUpdated && (
            <span className="hidden md:block text-[11px] font-mono text-slate-dim">
              Updated {fmtTime(lastUpdated)}
            </span>
          )}
          <div className="flex items-center gap-2 rounded-full border border-navy-400/50 bg-navy-700/60 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            <span className={`text-[11px] font-semibold tracking-wide ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
