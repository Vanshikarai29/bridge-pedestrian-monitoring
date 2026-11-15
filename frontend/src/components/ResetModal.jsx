import { useState } from 'react'
import { api } from '../lib/api.js'

export default function ResetModal({ bridgeId, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const confirm = async () => {
    setLoading(true); setErr('')
    try { await api.resetBridge(bridgeId); onConfirm() }
    catch (e) { setErr(e.message); setLoading(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: 'fade-in .15s ease' }}
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-[var(--color-border-2)] bg-[var(--color-surface-2)] p-6 shadow-2xl"
        style={{ animation: 'fade-in .2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-red)]/10 ring-1 ring-[var(--color-red)]/25">
          <span className="text-lg">⚠</span>
        </div>

        <h3 className="mb-2 text-base font-bold text-[var(--color-text-1)]">Reset bridge data?</h3>
        <p className="mb-5 text-sm leading-relaxed text-[var(--color-text-2)]">
          This permanently deletes all crossing events, occupancy history and alerts for{' '}
          <code className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 font-mono text-[var(--color-teal)] text-xs">
            {bridgeId}
          </code>.
          <br /><br />
          Use this for demos or testing. <span className="font-semibold text-[var(--color-red)]">Cannot be undone.</span>
        </p>

        {err && (
          <div className="mb-4 rounded-lg border border-[var(--color-red)]/25 bg-[var(--color-red)]/8 px-3 py-2 text-xs text-[var(--color-red)]">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-3)] px-4 py-2 text-sm font-medium text-[var(--color-text-2)] transition hover:border-[var(--color-border-2)] hover:text-[var(--color-text-1)]"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="rounded-lg bg-[var(--color-red)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Resetting…' : 'Reset bridge'}
          </button>
        </div>
      </div>
    </div>
  )
}
