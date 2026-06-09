import { useState } from 'react'
import { createPortal } from 'react-dom'
import { leadsApi } from '../lib/api'
import { toast } from '../lib/toast'

const STATUS_LABELS = {
  pending: 'Pendiente',
  no_answer: 'Sin respuesta',
  call_later: 'Llamar luego',
  closed: 'Agendado',
  rejected: 'Rechazado',
}

const STATUS_COLORS = {
  pending:   'text-amber-400   bg-amber-400/10   border-amber-400/25',
  no_answer: 'text-slate-400   bg-slate-400/10   border-slate-400/25',
  call_later:'text-blue-400    bg-blue-400/10    border-blue-400/25',
  closed:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
  rejected:  'text-red-400     bg-red-400/10     border-red-400/25',
}

const STATUS_ACCENT = {
  pending:   'bg-amber-400/8   border-amber-400/20',
  no_answer: 'bg-slate-400/8   border-slate-400/20',
  call_later:'bg-blue-400/8    border-blue-400/20',
  closed:    'bg-emerald-400/8 border-emerald-400/20',
  rejected:  'bg-red-400/8     border-red-400/20',
}

const QUICK_TAGS = {
  no_answer: ['Buzón de voz', 'No contesta', 'Número apagado', 'Ocupado'],
  closed:    ['Muy interesado', 'Reunión acordada', 'Enviar propuesta', 'Cerrando trato'],
  rejected:  ['No interesado', 'Ya tiene proveedor', 'Sin presupuesto', 'No es el momento'],
  call_later:['Pide más info', 'Estaba ocupado', 'Quiere pensar', 'Fuera de oficina'],
  pending:   [],
}

function getCallbackPresets() {
  const now = new Date()

  const today16 = new Date(now)
  today16.setHours(16, 0, 0, 0)

  const tom9 = new Date(now)
  tom9.setDate(tom9.getDate() + 1)
  tom9.setHours(9, 0, 0, 0)

  const tom12 = new Date(now)
  tom12.setDate(tom12.getDate() + 1)
  tom12.setHours(12, 0, 0, 0)

  const in2 = new Date(now)
  in2.setDate(in2.getDate() + 2)
  in2.setHours(9, 0, 0, 0)

  return [
    { label: 'Esta tarde · 16:00', date: today16, disabled: now.getHours() >= 15 },
    { label: 'Mañana · 9:00',      date: tom9,    disabled: false },
    { label: 'Mañana · 12:00',     date: tom12,   disabled: false },
    { label: 'En 2 días · 9:00',   date: in2,     disabled: false },
  ]
}

export default function CallNoteSheet({
  assignmentId,
  companyName,
  newStatus,
  onSave,
  onDismiss,
  onAddReminder,
}) {
  const [selectedTags, setSelectedTags] = useState([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customMode, setCustomMode] = useState(false)
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')

  const tags = QUICK_TAGS[newStatus] || []
  const isCallLater = newStatus === 'call_later'
  const presets = getCallbackPresets()

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const buildNote = () => {
    const parts = []
    if (selectedTags.length > 0) parts.push(selectedTags.join(' · '))
    if (note.trim()) parts.push(note.trim())
    return parts.join('\n')
  }

  const getCallbackDatetime = () => {
    if (customMode && customDate) {
      return new Date(`${customDate}T${customTime}`).toISOString()
    }
    if (selectedPreset !== null) {
      return presets[selectedPreset].date.toISOString()
    }
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const noteText = buildNote()
      await leadsApi.createCallLog(assignmentId, { note: noteText, status_at: newStatus })
      if (newStatus === 'rejected' && noteText.trim()) {
        await leadsApi.updateRejectionFeedback(assignmentId, noteText)
      }
      if (isCallLater) {
        const dt = getCallbackDatetime()
        if (dt && onAddReminder) {
          await onAddReminder(
            `📞 Llamar a ${companyName}${note.trim() ? ` — ${note.trim()}` : ''}`,
            dt
          )
        }
      }
      toast.success('Nota de llamada guardada')
      onSave?.()
    } catch {
      toast.error('Error al guardar la nota')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    /* Full overlay — montado en document.body via portal */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
        onClick={onDismiss}
      />

      {/* Floating card */}
      <div className="relative w-full max-w-md animate-modal-pop">

        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/8 to-transparent pointer-events-none" />

        <div className="relative bg-surface-raised border border-surface-border rounded-2xl overflow-hidden shadow-[0_24px_64px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)]">

          {/* Top accent stripe by status */}
          <div className={`h-0.5 w-full ${
            newStatus === 'closed'    ? 'bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent' :
            newStatus === 'rejected'  ? 'bg-gradient-to-r from-transparent via-red-400/60 to-transparent' :
            newStatus === 'call_later'? 'bg-gradient-to-r from-transparent via-blue-400/60 to-transparent' :
            newStatus === 'no_answer' ? 'bg-gradient-to-r from-transparent via-slate-400/40 to-transparent' :
                                        'bg-gradient-to-r from-transparent via-amber-400/60 to-transparent'
          }`} />

          <div className="p-5 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${STATUS_ACCENT[newStatus] || STATUS_ACCENT.pending}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${STATUS_COLORS[newStatus]?.split(' ')[0] || 'text-accent'}`}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Registrar llamada</p>
                <p className="font-bold text-white truncate text-sm">{companyName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge border text-[11px] font-bold px-2.5 py-1 ${STATUS_COLORS[newStatus] || STATUS_COLORS.pending}`}>
                  {STATUS_LABELS[newStatus] || newStatus}
                </span>
                <button
                  onClick={onDismiss}
                  className="w-7 h-7 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-slate-500 hover:text-white hover:bg-surface-hover transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-surface-border" />

            {/* Quick tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">¿Cómo fue la llamada?</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-150
                        ${selectedTags.includes(tag)
                          ? 'bg-accent/15 border-accent/40 text-accent scale-105 shadow-[0_0_8px_-2px_rgb(79_142_247_/_0.35)]'
                          : 'bg-surface-card border-surface-border text-slate-400 hover:border-slate-400 hover:text-slate-200'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nota (opcional)</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="¿Algo que quieras recordar de esta llamada?"
                rows={2}
                className="input-dark w-full resize-none text-sm"
              />
            </div>

            {/* Callback scheduler — solo call_later */}
            {isCallLater && (
              <div className="bg-blue-950/40 border border-blue-400/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-blue-400 flex-shrink-0">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-xs font-black text-blue-400 uppercase tracking-wider">¿Cuándo volvemos a llamar?</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset, i) => (
                    <button
                      key={i}
                      disabled={preset.disabled}
                      onClick={() => { setSelectedPreset(i); setCustomMode(false) }}
                      className={`text-xs px-3 py-2.5 rounded-lg border font-medium transition-all duration-150 text-left
                        ${selectedPreset === i && !customMode
                          ? 'bg-blue-400/15 border-blue-400/40 text-blue-300 shadow-[0_0_10px_-2px_rgb(96_165_250_/_0.45)]'
                          : preset.disabled
                            ? 'opacity-25 cursor-not-allowed bg-surface-card border-surface-border text-slate-500'
                            : 'bg-surface-card border-surface-border text-slate-300 hover:border-blue-400/30 hover:text-blue-300'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setCustomMode(true); setSelectedPreset(null) }}
                  className={`text-xs px-3 py-2 rounded-lg border w-full font-medium transition-all duration-150
                    ${customMode
                      ? 'bg-blue-400/15 border-blue-400/40 text-blue-300'
                      : 'bg-surface-card border-surface-border text-slate-400 hover:border-blue-400/30 hover:text-blue-300'
                    }`}
                >
                  Personalizar fecha y hora →
                </button>

                {customMode && (
                  <div className="flex gap-2 animate-fade-in">
                    <input
                      type="date"
                      value={customDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="input-dark flex-1 text-sm"
                    />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="input-dark w-28 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {saving ? 'Registrando...' : 'Registrar llamada'}
              </button>
              <button
                onClick={onDismiss}
                className="btn-ghost text-sm px-5"
              >
                Omitir
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
