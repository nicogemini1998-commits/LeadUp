import { useState, useEffect } from 'react'
import { m as motion, AnimatePresence } from 'motion/react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, PieChart, Pie,
} from 'recharts'
import { adminApi } from '../lib/api'
import NavBar from '../components/NavBar'
import WeeklyRace from '../components/WeeklyRace'

const STATUS_CFG = {
  closed:     { label: 'Agendado',      color: '#10b981' },
  pending:    { label: 'Pendiente',     color: '#fbbf24' },
  call_later: { label: 'Llamar luego',  color: '#a78bfa' },
  no_answer:  { label: 'Sin respuesta', color: '#64748b' },
  rejected:   { label: 'Rechazado',     color: '#f87171' },
  wrong_number: { label: 'Nº Erróneo',   color: '#fb923c' },
}
const STATUS_ORDER = ['closed', 'pending', 'call_later', 'no_answer', 'rejected', 'wrong_number']

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'text-white', icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="card p-4 flex items-center gap-3"
    >
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center flex-shrink-0 text-slate-400">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Pipeline bar chart ────────────────────────────────────────────────────────
function PipelineChart({ statusMap, total }) {
  if (!total) return null
  const data = STATUS_ORDER.map(s => ({
    name: STATUS_CFG[s].label,
    value: statusMap[s] || 0,
    fill: STATUS_CFG[s].color,
    pct: total > 0 ? Math.round(((statusMap[s] || 0) / total) * 100) : 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 96, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" stroke="#475569" width={96} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff', fontSize: 12 }}
          formatter={(v, _, props) => [`${v.toLocaleString('es-ES')} (${props.payload.pct}%)`, '']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', style: { fontSize: 10, fill: '#64748b' }, formatter: v => v > 0 ? v : '' }}>
          {data.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Commercial row ────────────────────────────────────────────────────────────
function CommercialRow({ c, rank, maxClosed }) {
  const [open, setOpen] = useState(false)

  const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const convTier = c.conversion_rate >= 20 ? 'emerald' : c.conversion_rate >= 10 ? 'amber' : 'slate'
  const tierCls = {
    emerald: { badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25', bar: 'bg-emerald-400' },
    amber:   { badge: 'text-amber-400 bg-amber-400/10 border-amber-400/25',       bar: 'bg-amber-400' },
    slate:   { badge: 'text-slate-400 bg-slate-400/10 border-slate-400/25',       bar: 'bg-slate-500' },
  }[convTier]

  const called = c.total_assigned - (c.pending || 0)
  const callRate = c.total_assigned > 0 ? Math.round((called / c.total_assigned) * 100) : 0
  const closedPct = maxClosed > 0 ? Math.round(((c.closed || 0) / maxClosed) * 100) : 0
  const total = (c.closed || 0) + (c.call_later || 0) + (c.no_answer || 0) + (c.rejected || 0) + (c.pending || 0) + (c.wrong_number || 0)

  const chartData = [
    { name: 'Agendado',      value: c.closed     || 0, fill: '#10b981' },
    { name: 'Llamar luego',  value: c.call_later || 0, fill: '#a78bfa' },
    { name: 'Sin respuesta', value: c.no_answer  || 0, fill: '#64748b' },
    { name: 'Rechazado',     value: c.rejected   || 0, fill: '#f87171' },
    { name: 'Nº Erróneo',   value: c.wrong_number || 0, fill: '#fb923c' },
    { name: 'Pendiente',     value: c.pending    || 0, fill: '#fbbf24' },
  ].filter(d => d.value > 0)
  const chartTotal = chartData.reduce((s, d) => s + d.value, 0)

  // Funnel data for visual
  const funnelItems = [
    { label: 'Asignados',   value: c.total_assigned, color: '#475569', pct: 100 },
    { label: 'Contactados', value: called,            color: '#a78bfa', pct: c.total_assigned > 0 ? Math.round(called / c.total_assigned * 100) : 0 },
    { label: 'Agendados',   value: c.closed || 0,     color: '#10b981', pct: c.total_assigned > 0 ? Math.round((c.closed || 0) / c.total_assigned * 100) : 0 },
  ]

  return (
    <div className="rounded-xl border border-surface-border/60 bg-surface-card overflow-hidden hover:border-accent/30 transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-slate-600 w-5 flex-shrink-0 tabular-nums">{rank}</span>

          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs
            ${c.lead_search_enabled
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-surface-raised text-slate-500 border border-surface-border'}`}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-bold text-white text-sm truncate">{c.name}</p>
              <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full border flex-shrink-0
                ${c.lead_search_enabled
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-slate-500 bg-surface-raised border-surface-border'}`}
              >
                <span className={`w-1 h-1 rounded-full ${c.lead_search_enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {c.lead_search_enabled ? 'Activo' : 'Pausado'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-surface-border rounded-full overflow-hidden flex-1 max-w-32">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${closedPct}%` }}
                  transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                  className={`h-full rounded-full ${tierCls.bar}`}
                />
              </div>
              <span className="text-[9px] text-slate-600 tabular-nums">{c.closed || 0} agendados</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            {[
              { val: c.today_count,    lbl: 'hoy',        cls: 'text-white' },
              { val: c.total_assigned, lbl: 'total',      cls: 'text-slate-300' },
              { val: c.pending || 0,   lbl: 'pendientes', cls: 'text-amber-400' },
              { val: c.closed  || 0,   lbl: 'agendados',  cls: 'text-emerald-400' },
            ].map(({ val, lbl, cls }) => (
              <div key={lbl} className="text-center min-w-[36px]">
                <p className={`text-sm font-black tabular-nums ${cls}`}>{val}</p>
                <p className="text-[9px] text-slate-600">{lbl}</p>
              </div>
            ))}
          </div>

          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-sm font-black tabular-nums flex-shrink-0 ${tierCls.badge}`}>
            {c.conversion_rate}%
          </span>

          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-4 h-4 text-slate-500 flex-shrink-0"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </button>

      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? '1000px' : '0px' }}
      >
        <div className="border-t border-surface-border bg-surface-card/40 p-5 space-y-4">

          {/* ── Funnel visual ── */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Embudo de conversión</p>
            <div className="flex items-end gap-1.5">
              {funnelItems.map((item, i) => (
                <div key={item.label} className="flex-1">
                  <div className="relative rounded-t-lg overflow-hidden" style={{ height: 48 }}>
                    <div className="absolute inset-0 rounded-t-lg" style={{ background: 'rgb(var(--color-surface-border) / 0.3)' }} />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(item.pct, item.value > 0 ? 8 : 0)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.12, ease: 'easeOut' }}
                      className="absolute bottom-0 left-0 right-0 rounded-t-lg"
                      style={{ background: item.color, opacity: 0.85 }}
                    />
                  </div>
                  <div className="mt-1.5 text-center">
                    <p className="text-sm font-black tabular-nums" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[9px] text-slate-600">{item.label}</p>
                    <p className="text-[9px] font-bold" style={{ color: item.color }}>{item.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Pendiente',    value: c.pending,    color: 'text-amber-400',   bg: 'bg-amber-400/5' },
              { label: 'Agendado',     value: c.closed,     color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
              { label: 'Llamar luego', value: c.call_later, color: 'text-violet-400',  bg: 'bg-violet-400/5' },
              { label: 'Sin resp.',    value: c.no_answer,  color: 'text-slate-400',   bg: 'bg-slate-400/5' },
              { label: 'Rechazado',    value: c.rejected,   color: 'text-red-400',     bg: 'bg-red-400/5' },
              { label: 'Nº Erróneo',  value: c.wrong_number, color: 'text-orange-400',  bg: 'bg-orange-400/5' },
            ].map(m => (
              <div key={m.label} className={`${m.bg} border border-surface-border rounded-xl p-3 text-center`}>
                <p className={`text-xl font-black tabular-nums ${m.color}`}>{m.value ?? 0}</p>
                <p className="text-[9px] text-slate-600 mt-1 leading-tight">{m.label}</p>
              </div>
            ))}
          </div>

          {/* ── Métricas clave + distribución ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Métricas */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Métricas clave</p>
              {[
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" /></svg>,
                  label: 'Tasa de contacto',
                  value: `${callRate}%`,
                  sub: `${called} de ${c.total_assigned} llamados`,
                  color: callRate >= 70 ? '#10b981' : callRate >= 40 ? '#f59e0b' : '#f87171',
                },
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
                  label: 'Conversión total',
                  value: `${c.conversion_rate}%`,
                  sub: `${c.closed || 0} agendados`,
                  color: c.conversion_rate >= 20 ? '#10b981' : c.conversion_rate >= 10 ? '#f59e0b' : '#94a3b8',
                },
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                  label: 'Esta semana',
                  value: c.week_closed ?? 0,
                  sub: 'agendados 7 días',
                  color: '#a78bfa',
                },
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                  label: 'Cuota diaria',
                  value: c.leads_per_day,
                  sub: 'leads configurados',
                  color: 'var(--text-primary)',
                },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-raised border border-surface-border">
                  <div className="w-7 h-7 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center flex-shrink-0 text-slate-500">
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{m.label}</p>
                    <p className="text-xs text-slate-500">{m.sub}</p>
                  </div>
                  <p className="text-lg font-black tabular-nums flex-shrink-0" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Distribución + nichos */}
            <div className="space-y-3">
              {chartTotal > 0 && (
                <div className="bg-surface-raised border border-surface-border rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Distribución pipeline</p>
                  <div className="space-y-2">
                    {chartData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                        <span className="text-[9px] text-slate-500 w-20 truncate">{d.name}</span>
                        <div className="flex-1 h-2.5 bg-surface-border rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((d.value / chartTotal) * 100)}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: d.fill }}
                          />
                        </div>
                        <span className="text-[9px] font-bold tabular-nums w-6 text-right" style={{ color: d.fill }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {c.top_industries?.length > 0 && (
                <div className="bg-surface-raised border border-surface-border rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Nichos trabajados</p>
                  <div className="space-y-1.5">
                    {c.top_industries.slice(0, 4).map((ind, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-600 w-3 tabular-nums">{i + 1}</span>
                        <p className="text-[11px] text-slate-300 flex-1 truncate">{ind.industry}</p>
                        <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((ind.count / (c.top_industries[0]?.count || 1)) * 100)}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full rounded-full bg-accent/60"
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 tabular-nums">{ind.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {c.industry_filters?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nichos asignados</p>
              <div className="flex flex-wrap gap-1.5">
                {c.industry_filters.map((f, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent font-medium">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Niches section — solo nicho + count ───────────────────────────────────────
function NicheSection() {
  const [niches, setNiches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getPendingByNiche()
      .then(r => setNiches(r.data.niches || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="card p-4">
      <div className="h-3 w-28 bg-surface-raised rounded animate-pulse mb-3" />
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-24 rounded-xl bg-surface-raised animate-pulse" />)}
      </div>
    </div>
  )

  if (!niches.length) return null

  const totalPending = niches.reduce((s, n) => s + n.total_pending, 0)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Leads por nicho</p>
        <span className="text-xs font-black text-amber-400 tabular-nums">{totalPending} en espera</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {niches.map(n => {
          const count = n.total_pending
          const dot = count <= 3 ? '#ef4444' : count <= 8 ? '#f59e0b' : '#a78bfa'
          return (
            <div
              key={n.industry}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors"
              style={{
                background: 'rgb(var(--color-surface-raised))',
                borderColor: 'rgb(var(--color-surface-border) / 0.7)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot, boxShadow: `0 0 4px ${dot}80` }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{n.industry}</span>
              <span className="text-xs font-black tabular-nums" style={{ color: dot }}>{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Analytics page ───────────────────────────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const fetchData = () => {
    adminApi.getAnalytics()
      .then(r => { setData(r.data); setLastUpdated(Date.now()); setSecondsAgo(0); setError(null) })
      .catch(() => setError('Error al cargar analytics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(); const p = setInterval(fetchData, 30_000); return () => clearInterval(p) }, [])
  useEffect(() => {
    if (!lastUpdated) return
    const t = setInterval(() => setSecondsAgo(Math.round((Date.now() - lastUpdated) / 1000)), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  if (loading) return (
    <><NavBar /><div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div></>
  )

  if (error) return (
    <><NavBar /><div className="max-w-6xl mx-auto px-6 py-10 text-center"><p className="text-red-400 text-sm">{error}</p><button onClick={fetchData} className="mt-3 text-xs text-accent hover:underline">Reintentar</button></div></>
  )

  const todayLabel = new Date(data.today + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const todayTotal = Object.values(data.today_by_status).reduce((a, b) => a + b, 0)
  const allTotal = data.all_time.total_assigned
  const commercials = [...data.by_commercial].sort((a, b) => b.conversion_rate - a.conversion_rate)
  const maxClosed = Math.max(...commercials.map(c => c.closed || 0), 1)

  return (
    <>
      <NavBar />
      <main className="max-w-6xl mx-auto px-5 pt-5 pb-10 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Analítica</h1>
            <p className="text-sm text-slate-500 capitalize mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-surface-border">
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-bold text-emerald-400">En vivo</span>
            <span className="text-[10px] text-slate-600">· {secondsAgo < 5 ? 'ahora mismo' : `hace ${secondsAgo}s`}</span>
            <button onClick={fetchData} className="ml-1 text-slate-500 hover:text-accent transition-colors" title="Actualizar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard delay={0}    label="Leads hoy"       value={data.total_leads_today}                       sub={`de ${data.by_commercial.reduce((a, c) => a + c.leads_per_day, 0)} posibles`}   color="text-white"        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} />
          <KpiCard delay={0.05} label="Conversión"      value={`${data.all_time.conversion_rate}%`}          sub={`${data.all_time.by_status?.closed || 0} agendados / ${allTotal}`}              color={data.all_time.conversion_rate >= 20 ? 'text-emerald-400' : data.all_time.conversion_rate >= 10 ? 'text-amber-400' : 'text-slate-300'} icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>} />
          <KpiCard delay={0.1}  label="Total histórico" value={allTotal.toLocaleString('es-ES')}              sub="leads asignados"                                                                 color="text-accent"       icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
          <KpiCard delay={0.15} label="Empresas en BD"  value={data.total_companies.toLocaleString('es-ES')} sub="disponibles"                                                                     color="text-slate-300"    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>} />
        </div>

        {/* Weekly Race */}
        <WeeklyRace commercials={data.by_commercial} />

        {/* Niches — solo nicho + count */}
        <NicheSection />

        {/* Pipeline hoy + Histórico */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pipeline hoy</p>
              <span className="text-xs font-bold text-white bg-surface-raised border border-surface-border px-2 py-0.5 rounded-lg">{todayTotal} leads</span>
            </div>
            {todayTotal > 0
              ? <PipelineChart statusMap={data.today_by_status} total={todayTotal} />
              : <div className="flex flex-col items-center justify-center py-8 text-slate-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mb-2 opacity-40"><path d="M3 3h18v4H3z"/><path d="M3 7v14h18V7"/><path d="M8 11h8M8 15h5"/></svg><p className="text-xs italic">Sin actividad hoy</p></div>
            }
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico total</p>
              <span className="text-xs font-bold text-white bg-surface-raised border border-surface-border px-2 py-0.5 rounded-lg">{allTotal.toLocaleString('es-ES')} leads</span>
            </div>
            {allTotal > 0 ? <PipelineChart statusMap={data.all_time.by_status} total={allTotal} /> : <p className="text-xs text-slate-600 italic">Sin datos históricos</p>}
          </div>
        </div>

        {/* Rendimiento por comercial */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rendimiento por comercial</p>
            <p className="text-[11px] text-slate-600">Clic para desglose · tiempo real</p>
          </div>
          <div className="space-y-2">
            {commercials.map((c, rank) => (
              <CommercialRow key={c.id} c={c} rank={rank + 1} maxClosed={maxClosed} />
            ))}
          </div>
        </div>

      </main>
    </>
  )
}
