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
      onClick={onCancel}
      style={{
        position:'fixed', inset:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(4,13,24,.75)', backdropFilter:'blur(6px)',
        animation:'fade-up .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:400, margin:'0 16px',
          borderRadius:18, padding:28,
          background:'var(--color-panel-2)',
          border:'1px solid var(--color-border-2)',
          boxShadow:'0 24px 60px rgba(0,0,0,.5)',
          animation:'fade-up .2s ease',
        }}
      >
        {/* Warning icon */}
        <div style={{
          width:44, height:44, borderRadius:'50%', marginBottom:16,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
          background:'rgba(255,82,82,.1)', border:'1px solid rgba(255,82,82,.25)',
        }}>⚠</div>

        <h3 style={{ fontSize:16, fontWeight:700, color:'var(--color-t1)', marginBottom:10 }}>
          Reset bridge data?
        </h3>
        <p style={{ fontSize:13, lineHeight:1.65, color:'var(--color-t2)', marginBottom:22 }}>
          This permanently deletes all crossing events, occupancy history and alerts for{' '}
          <code style={{
            fontFamily:'var(--font-mono)', fontSize:12,
            background:'var(--color-panel)', color:'var(--color-teal)',
            borderRadius:5, padding:'1px 7px', border:'1px solid var(--color-border)',
          }}>{bridgeId}</code>.
          {' '}<strong style={{ color:'var(--color-red)' }}>Cannot be undone.</strong>
        </p>

        {err && (
          <div style={{
            marginBottom:16, padding:'8px 12px', borderRadius:8, fontSize:12,
            background:'rgba(255,82,82,.1)', color:'var(--color-red)', border:'1px solid rgba(255,82,82,.25)',
          }}>{err}</div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onCancel} style={{
            padding:'9px 20px', borderRadius:9, border:'1px solid var(--color-border)',
            background:'var(--color-panel-3)', color:'var(--color-t2)',
            fontSize:13, fontWeight:500, cursor:'pointer', transition:'all .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color='var(--color-t1)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--color-t2)'}
          >Cancel</button>
          <button onClick={confirm} disabled={loading} style={{
            padding:'9px 20px', borderRadius:9, border:'none',
            background:'var(--color-red)', color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .15s',
            opacity: loading ? .6 : 1,
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter='brightness(1.15)' }}
            onMouseLeave={e => e.currentTarget.style.filter='none'}
          >
            {loading ? 'Resetting…' : 'Reset bridge'}
          </button>
        </div>
      </div>
    </div>
  )
}
