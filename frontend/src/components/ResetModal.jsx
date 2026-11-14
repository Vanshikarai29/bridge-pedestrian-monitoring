import { useState } from 'react'
import { api } from '../lib/api.js'

export default function ResetModal({ bridgeId, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  const confirm = async () => {
    setLoading(true); setErr('')
    try {
      await api.resetBridge(bridgeId)
      onConfirm()
    } catch (e) { setErr(e.message); setLoading(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-md [animation:var(--animate-fade-up)]"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-navy-400/50 bg-navy-700 p-6 shadow-2xl [animation:var(--animate-fade-up)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-crimson-400/10 ring-1 ring-crimson-400/30">
          <span className="text-lg">⚠</span>
        </div>

        <h3 className="mb-2 text-base font-bold text-slate-text">Reset bridge data?</h3>
        <p className="mb-5 text-sm leading-relaxed text-slate-muted">
          This will <span className="font-semibold text-crimson-400">permanently delete</span> all
          crossing events, occupancy counts, and alert history for{' '}
          <code className="rounded bg-navy-600 px-1.5 py-0.5 font-mono text-teal-500">{bridgeId}</code>.
          <br /><br />
          Use this for demos or testing only. This cannot be undone.
        </p>

        {err && (
          <p className="mb-3 rounded-lg border border-crimson-400/30 bg-crimson-400/10 px-3 py-2 text-xs text-crimson-400">{err}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-navy-400/60 bg-navy-600/50 px-4 py-2 text-sm font-medium text-slate-muted hover:bg-navy-500/50 hover:text-slate-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="rounded-lg bg-crimson-400 px-4 py-2 text-sm font-bold text-white hover:bg-crimson-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Resetting…' : 'Reset bridge'}
          </button>
        </div>
      </div>
    </div>
  )
}
