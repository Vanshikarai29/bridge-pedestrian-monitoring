import { useState } from 'react'
import { useDashboard } from './hooks/useDashboard.js'
import Header from './components/Header.jsx'
import OccupancyCard from './components/OccupancyCard.jsx'
import StatsRow from './components/StatsRow.jsx'
import FootfallChart from './components/FootfallChart.jsx'
import AlertLog from './components/AlertLog.jsx'
import ResetModal from './components/ResetModal.jsx'

export default function App() {
  const [bridgeId, setBridgeId] = useState('bridge-1')
  const [showReset, setShowReset] = useState(false)

  const { occupancy, footfall, alerts, bridges, status, lastUpdated, refresh } =
    useDashboard(bridgeId, 3000)

  return (
    /* Outer shell: exact viewport height, no overflow on root */
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
      overflow: 'hidden',
    }}>

      {/* ── Sticky Header ── */}
      <Header
        status={status}
        lastUpdated={lastUpdated}
        bridgeId={bridgeId}
        bridges={bridges}
        onBridgeChange={setBridgeId}
        onRefresh={refresh}
        onReset={() => setShowReset(true)}
      />

      {/* ── Scrollable main: flex:1 so it takes all remaining height ── */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 16px',
        gap: 14,
        minHeight: 0,
      }}>

        {/* Alert banner */}
        {occupancy?.alert_active && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderRadius: 10,
            background: 'rgba(255,82,82,.07)',
            border: '1px solid rgba(255,82,82,.35)',
            flexShrink: 0,
          }}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-red)', animation: 'pulse-red 1.4s infinite',
            }} />
            <p style={{ fontSize: 13, lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--color-red)' }}>Overcrowding alert active — </strong>
              <span style={{ color: 'var(--color-t2)' }}>
                {occupancy.occupancy} people on bridge, threshold is {occupancy.threshold}
              </span>
            </p>
          </div>
        )}

        {/* Stats cards row */}
        <StatsRow occupancy={occupancy} footfall={footfall} alerts={alerts} />

        {/* Gauge + Chart: always side-by-side, fixed height */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)',
          gap: 14,
          height: '380px',       /* fixed height — no grow/shrink fight */
          flexShrink: 0,
        }}>
          <OccupancyCard occupancy={occupancy} bridgeId={bridgeId} onRefresh={refresh} />
          <FootfallChart bridgeId={bridgeId} />
        </div>

        {/* Alert log */}
        <AlertLog alerts={alerts} />

      </main>

      {/* ── Footer ── */}
      <footer style={{
        flexShrink: 0,
        padding: '8px 20px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-panel)',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-t3)',
      }}>
        <span>YOLOv8 → ByteTrack → virtual line counter → Flask API → React</span>
        <span>Polling <span style={{ color: 'var(--color-teal)' }}>/api</span> every 3 s</span>
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
