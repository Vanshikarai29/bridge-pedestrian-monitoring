import { useState } from 'react'
import { useDashboard } from './hooks/useDashboard.js'
import Header        from './components/Header.jsx'
import OccupancyCard from './components/OccupancyCard.jsx'
import StatsRow      from './components/StatsRow.jsx'
import FootfallChart from './components/FootfallChart.jsx'
import AlertLog      from './components/AlertLog.jsx'
import ResetModal    from './components/ResetModal.jsx'

export default function App() {
  const [bridgeId,  setBridgeId]  = useState('bridge-1')
  const [showReset, setShowReset] = useState(false)

  const {
    occupancy, footfall, alerts, bridges,
    status, lastUpdated, refresh,
  } = useDashboard(bridgeId, 3000)

  const isOvercrowded = occupancy?.alert_active

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--color-bg)' }}>

      <Header
        status={status}
        lastUpdated={lastUpdated}
        bridgeId={bridgeId}
        bridges={bridges}
        onBridgeChange={setBridgeId}
        onRefresh={refresh}
        onReset={() => setShowReset(true)}
      />

      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 py-6 sm:px-6 lg:px-8">

        {/* Overcrowding banner */}
        {isOvercrowded && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: 'rgba(240,82,82,.3)',
              background:  'rgba(240,82,82,.06)',
              animation:   'fade-in .3s ease',
            }}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: 'var(--color-red)', animation: 'pulse-red 1.5s ease-in-out infinite' }}
            />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold" style={{ color: 'var(--color-red)' }}>
                Overcrowding alert active
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                {occupancy.occupancy} people on bridge — threshold is {occupancy.threshold}
              </span>
            </div>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">

          {/* Left column */}
          <div className="flex flex-col gap-5">
            <OccupancyCard
              occupancy={occupancy}
              bridgeId={bridgeId}
              onRefresh={refresh}
            />
            <StatsRow occupancy={occupancy} footfall={footfall} alerts={alerts} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <FootfallChart bridgeId={bridgeId} />

            {/* Pipeline info */}
            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}
            >
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>
                Detection pipeline
              </h3>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                {[
                  ['YOLOv8', 'Detector'],
                  ['ByteTrack', 'Tracker'],
                  ['Line Counter', 'Virtual crossing'],
                  ['Flask API', 'REST backend'],
                  ['React', 'This dashboard'],
                ].map(([name, desc], i, arr) => (
                  <span key={name} className="flex items-center gap-2">
                    <span className="group relative">
                      <span
                        className="cursor-default rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
                        style={{
                          borderColor: 'rgba(47,212,192,.2)',
                          background:  'rgba(47,212,192,.06)',
                          color:        'var(--color-teal)',
                        }}
                        title={desc}
                      >
                        {name}
                      </span>
                    </span>
                    {i < arr.length - 1 && (
                      <span style={{ color: 'var(--color-border-2)' }}>→</span>
                    )}
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
      <footer
        className="border-t px-6 py-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-3 font-mono text-[11px]" style={{ color: 'var(--color-text-3)' }}>
          <span>Bridge Pedestrian Monitoring · ML-based crowd safety system</span>
          <span>
            Polling{' '}
            <code
              className="rounded px-1.5 py-0.5 text-[11px]"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-teal)' }}
            >
              /api
            </code>
            {' '}every 3 s
          </span>
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
