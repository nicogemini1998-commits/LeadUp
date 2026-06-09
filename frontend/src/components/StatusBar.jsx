import { useState } from 'react'
import { leadsApi } from '../lib/api'
import { toast } from '../lib/toast'

// External booking/calendar link, configured via VITE_BOOKING_URL.
// Leave empty to disable the auto-open behavior when a lead is marked "closed".
const BOOKING_URL = import.meta.env.VITE_BOOKING_URL || ''

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pendiente',     color: 'text-amber-400  bg-amber-400/10  border-amber-400/25  hover:bg-amber-400/20',  glow: 'shadow-[0_0_10px_-2px_rgb(251_191_36_/_0.5)]'  },
  { value: 'no_answer',  label: 'Sin respuesta', color: 'text-slate-300  bg-slate-400/10  border-slate-400/25  hover:bg-slate-400/20',  glow: 'shadow-[0_0_10px_-2px_rgb(148_163_184_/_0.4)]' },
  { value: 'call_later', label: 'Llamar luego',  color: 'text-violet-400 bg-violet-400/10 border-violet-400/25 hover:bg-violet-400/20', glow: 'shadow-[0_0_10px_-2px_rgb(167_139_250_/_0.5)]' },
  { value: 'closed',     label: 'Agendado',      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25 hover:bg-emerald-400/20', glow: 'shadow-[0_0_10px_-2px_rgb(52_211_153_/_0.5)]' },
  { value: 'rejected',   label: 'Rechazado',     color: 'text-red-400    bg-red-400/10    border-red-400/25    hover:bg-red-400/20',    glow: 'shadow-[0_0_10px_-2px_rgb(248_113_113_/_0.5)]' },
  { value: 'wrong_number', label: 'Nº Erróneo',   color: 'text-orange-400 bg-orange-400/10 border-orange-400/25 hover:bg-orange-400/20', glow: 'shadow-[0_0_10px_-2px_rgb(251_146_60_/_0.5)]'  },
]

export default function StatusBar({ assignmentId, currentStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(currentStatus)

  const handleChange = async (newStatus) => {
    if (newStatus === active || loading) return
    setLoading(true)
    try {
      await leadsApi.updateStatus(assignmentId, newStatus)
      setActive(newStatus)
      onStatusChange?.(assignmentId, newStatus)
      const label = STATUS_OPTIONS.find(o => o.value === newStatus)?.label
      toast.success(label ?? 'Estado actualizado')

      if (newStatus === 'closed' && BOOKING_URL) {
        setTimeout(() => {
          const popup = window.open(BOOKING_URL, '_blank')
          if (!popup) {
            window.location.href = BOOKING_URL
          }
        }, 100)
      }
    } catch (err) {
      toast.error('Error al cambiar estado')
      console.error('Status update failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STATUS_OPTIONS.map((opt) => {
        const isActive = active === opt.value
        return (
          <button
            key={opt.value}
            onClick={(e) => { e.stopPropagation(); handleChange(opt.value) }}
            disabled={loading}
            className={`
              badge border text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer
              ${isActive
                ? `${opt.color} ${opt.glow} scale-105 shadow-card`
                : 'text-slate-500 bg-surface-card border-surface-border hover:border-slate-400 hover:text-slate-300 hover:scale-105'
              }
              disabled:opacity-60 disabled:cursor-not-allowed
            `}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-soft" />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
