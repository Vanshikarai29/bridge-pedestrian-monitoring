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

  const { occupancy, footfall, alerts, bridges, status, lastUpdated, refresh } =
    useDashboard(bridgeId, 3000)

  return (
    <div className="flex min-h-screen flex-col" style={{ background:'var(--color-bg)' }}>

      <Header
        status={status}
        lastUpdated={lastUpdated}
        bridgeId={bridgeId}
        bridges={bridges}
        onBridgeChange={setBridgeId}
        onRefresh={refresh}
        onReset={() => setShowReset(true)}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-xl space-y-5">

          {/* ── Overcrowding banner ── */}
          {occupancy?.alert_active && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background:'rgba(255,82,82,.06)',
                outline:'1px solid rgba(255,82,82,.3)',
                animation:'fade-up .3s ease',
              }}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background:'var(--color-red)', animation:'pulse-red 1.4s infinite' }} />
              <p className="text-sm">
                <span className="font-bold" style={{ color:'var(--color-red)' }}>Overcrowding alert active — </span>
                <span style={{ color:'var(--color-t2)' }}>
                  {occupancy.occupancy} people on bridge, threshold is {occupancy.threshold}
                </span>
              </p>
            </div>
          )}

          {/* ── Row 1: 4 stat cards ── */}
          <StatsRow occupancy={occupancy} footfall={footfall} alerts={alerts} />

          {/* ── Row 2: Occupancy gauge + Footfall chart ── */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <OccupancyCard occupancy={occupancy} bridgeId={bridgeId} onRefresh={refresh} />
            <FootfallChart bridgeId={bridgeId} />
          </div>

          {/* ── Row 3: Alert log full width ── */}
          <AlertLog alerts={alerts} />

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-6 py-3"
        style={{ borderTop:'1px solid var(--color-border)', background:'var(--color-panel)' }}>
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
          style={{ color:'var(--color-t3)' }}>
          <span>YOLOv8 → ByteTrack → virtual line counter → Flask API → React dashboard</span>
          <span>Polling <code style={{ color:'var(--color-teal)' }}>/api</code> every 3 s</span>
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
