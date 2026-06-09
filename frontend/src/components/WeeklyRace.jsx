import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'

function CountUp({ to, duration = 900 }) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (to === 0) { setVal(0); return }
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * to))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [to, duration])
  return <>{val}</>
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

const LANE_STYLES = [
  { bar: 'from-violet-500 to-purple-500',   text: 'text-violet-300',  badge: 'bg-violet-500/15 text-violet-300 border-violet-400/30', glow: 'shadow-[0_0_16px_rgba(124,58,237,0.5)]' },
  { bar: 'from-violet-400 to-fuchsia-500',  text: 'text-fuchsia-300', badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30', glow: '' },
  { bar: 'from-purple-500 to-violet-400',   text: 'text-purple-300',  badge: 'bg-purple-500/15 text-purple-300 border-purple-400/30', glow: '' },
  { bar: 'from-violet-600 to-purple-400',   text: 'text-violet-400',  badge: 'bg-violet-600/15 text-violet-400 border-violet-500/30', glow: '' },
  { bar: 'from-slate-500 to-slate-600',     text: 'text-slate-400',   badge: 'bg-slate-500/15 text-slate-400 border-slate-400/30',    glow: '' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const rowVariant = {
  hidden: { opacity: 0, x: -20 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
}

export default function WeeklyRace({ commercials }) {
  const [goal, setGoal] = useState(() => {
    try { return parseInt(localStorage.getItem('leadup_weekly_goal') || '10') || 10 } catch { return 10 }
  })
  const [daysLeft, setDaysLeft] = useState(5)

  useEffect(() => {
    const d = new Date()
    const until = (7 - d.getDay()) % 7 || 7
    setDaysLeft(until)
  }, [])

  if (!commercials?.length) return null

  const sorted = [...commercials].sort((a, b) => (b.closed || 0) - (a.closed || 0))
  const teamTotal = sorted.reduce((s, c) => s + (c.closed || 0), 0)
  const leader = sorted[0]
  const leaderPct = goal > 0 ? Math.min(Math.round(((leader?.closed || 0) / goal) * 100), 100) : 0

  return (
    <div className="card p-6 space-y-5 relative overflow-hidden">
      {/* Ambient gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 10% 50%, #7c3aed, transparent)' }}
      />

      {/* Cabecera */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Progreso del Equipo</h3>
            {leaderPct >= 100 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 1 }}
              >🏆</motion.span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Leads agendados · semana activa</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total equipo</p>
            <p className="text-xl font-black text-white tabular-nums">
              <CountUp to={teamTotal} /> <span className="text-xs font-normal text-slate-500">agendados</span>
            </p>
          </div>
          <div className="h-8 w-px bg-surface-border" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Meta/persona</p>
            <input
              type="number" value={goal} min={1} step={1}
              onChange={e => {
                const v = parseInt(e.target.value) || 1
                setGoal(v)
                try { localStorage.setItem('leadup_weekly_goal', String(v)) } catch {}
              }}
              className="w-14 px-2 py-1 bg-surface-raised border border-surface-border text-white rounded-lg text-sm font-black text-center focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Cierre en</p>
            <p className="text-sm font-black text-accent tabular-nums">{daysLeft}d</p>
          </div>
        </div>
      </div>

      {/* Barras — stagger */}
      <motion.div
        className="relative space-y-2.5"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {sorted.map((c, i) => {
          const style = LANE_STYLES[Math.min(i, LANE_STYLES.length - 1)]
          const closed = c.closed || 0
          const pct = goal > 0 ? Math.min(Math.round((closed / goal) * 100), 100) : 0
          const initials = c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          const isLeader = i === 0 && closed > 0

          return (
            <motion.div key={c.id} variants={rowVariant} className="flex items-center gap-3">
              <span className="text-sm w-5 text-center flex-shrink-0">
                {i < RANK_ICONS.length
                  ? RANK_ICONS[i]
                  : <span className="text-[10px] font-black text-slate-600">{i + 1}</span>
                }
              </span>

              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 border ${style.badge} ${isLeader ? style.glow : ''} transition-shadow duration-500`}>
                {initials}
              </div>

              <span className={`text-sm font-bold w-16 truncate flex-shrink-0 ${isLeader ? style.text : 'text-slate-300'}`}>
                {c.name.split(' ')[0]}
              </span>

              <div className="flex-1 h-5 bg-surface-raised rounded-md overflow-hidden border border-surface-border/40 relative">
                {[25, 50, 75].map(m => (
                  <div key={m} className="absolute inset-y-0 w-px bg-white/5" style={{ left: `${m}%` }} />
                ))}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.09, ease: [0.32, 0.72, 0, 1] }}
                  className={`h-full rounded-md bg-gradient-to-r ${style.bar} relative overflow-hidden`}
                >
                  {pct > 0 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.8, delay: 0.8 + i * 0.1, repeat: Infinity, repeatDelay: 4 }}
                    />
                  )}
                </motion.div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 w-20 justify-end">
                <span className={`text-sm font-black tabular-nums ${style.text}`}>
                  <CountUp to={closed} />
                </span>
                <motion.span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums w-10 text-center ${style.badge}`}
                  animate={pct >= 100 ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.4, repeat: pct >= 100 ? Infinity : 0, repeatDelay: 2 }}
                >
                  {pct}%
                </motion.span>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="relative pt-3 border-t border-surface-border flex items-center justify-between">
        <p className="text-[10px] text-slate-600">{sorted.length} comerciales activos</p>
        <p className="text-[10px] text-slate-600">
          Meta: <span className="text-slate-400 font-bold">{goal} agendados</span> por persona
        </p>
      </div>
    </div>
  )
}
