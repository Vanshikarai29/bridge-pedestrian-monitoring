function StatCard({ icon, label, value, sub, colorClass, glowClass }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-navy-700/50 p-4 backdrop-blur-sm transition-all duration-200 hover:bg-navy-600/50 ${colorClass}`}>
      {/* glow blob */}
      <div className={`pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl opacity-20 ${glowClass}`} />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-dim">{label}</span>
        </div>
        <div className="font-mono text-2xl font-bold text-slate-text">{value}</div>
        {sub && <div className="mt-0.5 text-[10px] text-slate-dim">{sub}</div>}
      </div>
    </div>
  )
}

export default function StatsRow({ occupancy, alerts }) {
  const inCount  = occupancy?._in_today  ?? '—'
  const outCount = occupancy?._out_today ?? '—'
  const occ      = occupancy?.occupancy  ?? 0
  const thr      = occupancy?.threshold  ?? 40
  const net      = occupancy?.occupancy  ?? '—'
  const activeAlerts = Array.isArray(alerts) ? alerts.filter(a => a.active).length : 0

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon="↑"
        label="Pedestrians In"
        value={typeof occ === 'number' ? occ : '—'}
        sub="net entries counted"
        colorClass="border-teal-500/20"
        glowClass="bg-teal-500"
      />
      <StatCard
        icon="↓"
        label="Pedestrians Out"
        value="—"
        sub="exits counted"
        colorClass="border-navy-400/40"
        glowClass="bg-slate-muted"
      />
      <StatCard
        icon="⇄"
        label="Net Flow"
        value={typeof net === 'number' ? (net >= 0 ? `+${net}` : net) : '—'}
        sub="in minus out"
        colorClass="border-sky-400/20"
        glowClass="bg-sky-400"
      />
      <StatCard
        icon="⚠"
        label="Active Alerts"
        value={activeAlerts}
        sub={activeAlerts === 0 ? 'all clear' : 'threshold breached'}
        colorClass={activeAlerts > 0 ? 'border-crimson-400/30' : 'border-navy-400/40'}
        glowClass={activeAlerts > 0 ? 'bg-crimson-400' : 'bg-slate-dim'}
      />
    </div>
  )
}
