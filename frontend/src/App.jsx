import { useState } from 'react'
import { useDashboard } from './hooks/useDashboard.js'
import Header from './components/Header.jsx'
import BridgeSelector from './components/BridgeSelector.jsx'
import OccupancyCard from './components/OccupancyCard.jsx'
import StatsRow from './components/StatsRow.jsx'
import FootfallChart from './components/FootfallChart.jsx'
import AlertLog from './components/AlertLog.jsx'
import ResetModal from './components/ResetModal.jsx'

export default function App() {
  const [bridgeId,  setBridgeId]  = useState('bridge-1')
  const [showReset, setShowReset] = useState(false)

  const { occupancy, footfall, alerts, bridges, status, lastUpdated, refresh } =
    useDashboard(bridgeId, 3000)

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Header status={status} lastUpdated={lastUpdated} />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">

        {/* Top toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <BridgeSelector bridges={bridges} selected={bridgeId} onChange={setBridgeId} />

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 rounded-lg border border-navy-400/50 bg-navy-700/50 px-3 py-1.5 text-xs font-medium text-slate-muted transition-all hover:border-navy-300/60 hover:text-slate-text active:scale-95"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setShowReset(true)}
              className="flex items-center gap-1.5 rounded-lg border border-navy-400/50 bg-navy-700/50 px-3 py-1.5 text-xs font-medium text-slate-muted transition-all hover:border-crimson-400/40 hover:bg-crimson-400/5 hover:text-crimson-400 active:scale-95"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
              Reset
            </button>
          </div>
        </div>

        {/* Alert banner when overcrowded */}
        {occupancy?.alert_active && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-crimson-400/30 bg-crimson-400/8 px-4 py-3 [animation:var(--animate-fade-up)]">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-crimson-400 [animation:var(--animate-pulse-red)]" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-crimson-400">Overcrowding alert active</span>
              <span className="ml-2 text-xs text-slate-muted">
                {occupancy.occupancy} people on bridge — threshold is {occupancy.threshold}
              </span>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-5">
            <OccupancyCard
              occupancy={occupancy}
              bridgeId={bridgeId}
              onThresholdChange={refresh}
            />
            <StatsRow occupancy={occupancy} alerts={alerts} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <FootfallChart bridgeId={bridgeId} />

            {/* Mini pipeline info card */}
            <div className="rounded-2xl border border-navy-400/30 bg-navy-700/40 p-4">
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-dim">
                Detection pipeline
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                {['YOLOv8 detector', 'ByteTrack tracker', 'Virtual line counter', 'Flask REST API', 'React dashboard'].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-md border border-teal-500/20 bg-teal-500/5 px-2 py-1 text-teal-500">
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-navy-300">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Full-width alert log */}
          <div className="lg:col-span-2">
            <AlertLog alerts={alerts} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-400/30 bg-navy-800/50 px-6 py-3">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4 text-[11px] text-slate-dim flex-wrap">
          <span>Bridge Pedestrian Monitoring · ML-based crowd safety system</span>
          <span className="font-mono">Polling <code className="rounded bg-navy-700 px-1.5 py-0.5 text-teal-500">/api</code> every 3 s</span>
        </div>
      </footer>

      {showReset && (
        <ResetModal
          bridgeId={bridgeId}
          onConfirm={() => { setShowReset(false); refresh() }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  )
}
