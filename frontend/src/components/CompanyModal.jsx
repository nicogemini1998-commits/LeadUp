import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import StatusBar from './StatusBar'
import RemindersList from './RemindersList'
import CallNoteSheet from './CallNoteSheet'
import { notesApi, contactsApi, leadsApi, companiesApi } from '../lib/api'
import { toast } from '../lib/toast'
import { useReminders } from '../hooks/useReminders'
import { useCallLogs } from '../hooks/useCallLogs'
import { useAuth } from '../hooks/useAuth'

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-red-500',
]

function isMobilePrefix(prefix) {
  if (!prefix) return false
  const p = prefix.replace(/\D/g, '')
  return p.startsWith('6') || p.startsWith('7')
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

const OPP_CONFIG = {
  alta:  { label: 'Alta',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.15)' },
  media: { label: 'Media', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.12)' },
  baja:  { label: 'Baja',  color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.12)' },
}

const OPP_STYLES = {
  alta:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  media: 'text-amber-400  bg-amber-400/10  border-amber-400/30',
  baja:  'text-red-400    bg-red-400/10    border-red-400/30',
}

function scoreColor(s) {
  if (s >= 65) return 'text-emerald-400'
  if (s >= 35) return 'text-amber-400'
  return 'text-red-400'
}

function SectionLabel({ children, action, color }) {
  const c = color || 'var(--color-accent, #7c3aed)'
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-0.5 h-5 rounded-full" style={{ background: `linear-gradient(to bottom, ${c}, transparent)` }} />
        <span className="text-xs font-black text-white uppercase tracking-widest">
          {children}
        </span>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

function DiagRow({ label, value, active, note }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border/60 last:border-0 gap-4">
      <span className="text-sm text-slate-400 flex-shrink-0">{label}</span>
      <div className="text-right min-w-0">
        {active !== undefined ? (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border
            ${active
              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
              : 'text-slate-500 bg-surface-card border-surface-border'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {active ? 'Activo' : 'No detectado'}
          </span>
        ) : (
          <span className="text-sm text-white font-medium">{value}</span>
        )}
        {note && <p className="text-[11px] text-slate-500 mt-0.5">{note}</p>}
      </div>
    </div>
  )
}

function OppColumn({ title, icon, items }) {
  return (
    <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl p-4 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
      <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
            <span className="text-accent mt-0.5 flex-shrink-0">›</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildOpportunities(company) {
  const sales = []
  const tech = []
  const content = []

  if (!company.captacion_leads) sales.push('Sistema de captación de leads online')
  if (!company.email_marketing) sales.push('Automatización de email marketing / CRM')
  sales.push('Pipeline comercial con seguimiento digital')

  tech.push('Integración IA para atención y presupuestos')
  if (!company.seo_info) tech.push('Posicionamiento SEO para búsquedas locales')
  tech.push('Analytics y cuadro de mando digital')

  if (!company.video_contenido) content.push('Producción de vídeo corporativo y testimonios')
  if (!company.redes_sociales) content.push('Gestión de redes sociales y comunidad')
  content.push('Contenido audiovisual para captación')

  return { sales, tech, content }
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function ReportContent({ content }) {
  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*'))
        return <em key={i} className="italic">{part.slice(1, -1)}</em>
      return part
    })
  }

  const blocks = []
  const lines = content.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      blocks.push(<h1 key={i} className="text-xl font-black text-white mt-4 mb-1">{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      blocks.push(<h2 key={i} className="text-base font-black text-white mt-6 mb-2 pb-1 border-b border-surface-border">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      blocks.push(<h3 key={i} className="text-sm font-bold text-accent uppercase tracking-wider mt-4 mb-2">{line.slice(4)}</h3>)
    } else if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={i} className="border-surface-border/60 my-3" />)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
              <span className="text-accent flex-shrink-0 mt-0.5">›</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    } else if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      blocks.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
              <span className="text-accent font-bold flex-shrink-0 w-4">{j + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    } else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i])
        i++
      }
      const isHeaderNext = rows[1] && /^\|[-|: ]+\|$/.test(rows[1].trim())
      const parseRow = (row) => row.split('|').filter(c => c.trim() !== '').map(c => c.trim())
      const dataRows = isHeaderNext ? rows.slice(2) : rows.filter(r => !/^\|[-|: ]+\|$/.test(r.trim()))
      blocks.push(
        <div key={`table-${i}`} className="my-3 rounded-xl border border-surface-border overflow-hidden">
          <table className="w-full text-sm">
            {isHeaderNext && (
              <thead>
                <tr className="bg-surface-raised">
                  {parseRow(rows[0]).map((cell, j) => (
                    <th key={j} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2 border-b border-surface-border">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {dataRows.map((row, j) => (
                <tr key={j} className="border-b border-surface-border/40 last:border-0 hover:bg-surface-hover/30 transition-colors">
                  {parseRow(row).map((cell, k) => (
                    <td key={k} className="text-slate-300 px-3 py-2.5 align-top leading-relaxed">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.trim() === '') {
      blocks.push(<div key={i} className="h-1" />)
    } else {
      blocks.push(
        <p key={i} className="text-sm text-slate-300 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      )
    }
    i++
  }

  return <div className="space-y-0.5">{blocks}</div>
}

export default function CompanyModal({ lead, onClose, onStatusChange, onContactChange }) {
  const { user } = useAuth()
  const comercialName = user?.name?.split(' ')[0] || 'Tú'
  const [notes, setNotes] = useState(lead?.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  const [followUpDate, setFollowUpDate] = useState(lead?.follow_up_date || '')
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  const handleFollowUpChange = async (newDate) => {
    setSavingFollowUp(true)
    try {
      await leadsApi.updateFollowup(lead.assignment_id, newDate || null)
      setFollowUpDate(newDate)
      toast.success(newDate ? 'Seguimiento programado' : 'Seguimiento eliminado')
    } catch (_) {
      toast.error('Error al guardar seguimiento')
    } finally {
      setSavingFollowUp(false)
    }
  }

  const [contact, setContact] = useState(lead?.contact || null)
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: lead?.contact?.name || '',
    title: lead?.contact?.title || '',
    phone: lead?.contact?.phone || '',
    email: lead?.contact?.email || '',
  })
  const [savingContact, setSavingContact] = useState(false)
  const [contactError, setContactError] = useState(null)

  const [revealedPhone, setRevealedPhone] = useState(
    lead?.contact?.phone_revealed ? lead?.contact?.phone : null
  )
  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState(null)

  const [rejectionFeedback, setRejectionFeedback] = useState(lead?.rejection_feedback || '')
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [feedbackSaved, setFeedbackSaved] = useState(false)

  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [reportCached, setReportCached] = useState(false)

  const [sectorOpen, setSectorOpen] = useState(false)
  const [sectorData, setSectorData] = useState(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [sectorLoading, setSectorLoading] = useState(false)
  const [sectorError, setSectorError] = useState(null)

  // ── Hooks: Reminders ──────────────────────────────────────────────────────
  const {
    reminders,
    loading: remindersLoading,
    add: addReminder,
    edit: editReminder,
    delete: deleteReminder,
  } = useReminders(lead?.assignment_id)

  const { logs: callLogs, loading: callLogsLoading, refetch: refetchLogs } = useCallLogs(lead?.assignment_id)
  const [pendingCallNote, setPendingCallNote] = useState(null) // { status, companyName }

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    setNotesSaved(false)
    try {
      await notesApi.update(lead.assignment_id, notes)
      setNotesSaved(true)
      toast.success('Nota guardada')
    } catch (err) {
      toast.error('Error al guardar la nota')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStartEditContact = () => {
    setContactForm({
      name: contact?.name || '',
      title: contact?.title || '',
      phone: contact?.phone || '',
      email: contact?.email || '',
    })
    setContactError(null)
    setEditingContact(true)
  }

  const handleCancelEditContact = () => {
    setEditingContact(false)
    setContactError(null)
  }

  const handleSaveContact = async () => {
    if (!contact?.id) return
    setSavingContact(true)
    setContactError(null)
    try {
      const res = await contactsApi.update(contact.id, contactForm)
      const updated = res.data
      setContact(updated)
      onContactChange?.(lead.assignment_id, updated)
      setEditingContact(false)
      toast.success('Contacto actualizado')
    } catch (err) {
      setContactError('Error al guardar. Inténtalo de nuevo.')
      toast.error('Error al guardar el contacto')
    } finally {
      setSavingContact(false)
    }
  }

  const handleGenerateReport = async (forceRegenerate = false) => {
    if (reportLoading) return
    if (forceRegenerate) {
      try { await leadsApi.clearReportCache(lead.assignment_id) } catch (_) {}
    }
    setReportLoading(true)
    setReportError(null)
    const id = toast.loading('Generando informe...')
    try {
      const res = await leadsApi.generateReport(lead.assignment_id)
      setReport(res.data.report)
      setReportCached(res.data.cached)
      toast.dismiss(id)
      toast.success('Informe generado')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al generar el informe'
      setReportError(msg)
      toast.dismiss(id)
      toast.error('Error al generar informe', msg)
    } finally {
      setReportLoading(false)
    }
  }

  const handleSectorAnalysis = async () => {
    if (sectorLoading) return
    setSectorLoading(true)
    setSectorError(null)
    try {
      const res = await companiesApi.sectorAnalysis(company.id)
      setSectorData(res.data?.data || res.data)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Análisis no disponible. Inténtalo en unos minutos.'
      setSectorError(msg)
    } finally {
      setSectorLoading(false)
    }
  }

  const handleRevealPhone = async () => {
    if (revealing) return
    setRevealing(true)
    setRevealError(null)
    try {
      const res = await leadsApi.revealPhone(lead.assignment_id)
      const phone = res.data.phone
      setRevealedPhone(phone)
      setContact(prev => prev ? { ...prev, phone, phone_revealed: true } : prev)
      toast.success('Número revelado', phone)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al revelar el número'
      setRevealError(msg)
      toast.error('No se pudo revelar el número', msg)
    } finally {
      setRevealing(false)
    }
  }


  const createVCard = (name, title, email, phone, org) => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      title ? `TITLE:${title}` : '',
      org ? `ORG:${org}` : '',
      `TEL;TYPE=CELL:${phone}`,
      email ? `EMAIL:${email}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n')
    return vcard
  }

  const saveToContacts = () => {
    if (!mobile || !contact) return
    const name = contact.name || company.name
    const title = contact.title || ''
    const email = contact.email || ''
    const phone = mobile.replace(/\s/g, '')
    const org = company.name || ''
    const vcard = createVCard(name, title, email, phone, org)
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCallWithContact = (phoneNumber, contactName, contactTitle, contactEmail, companyName) => {
    const cleanPhone = phoneNumber.replace(/\s/g, '')
    const name = contactName || companyName
    const title = contactTitle || ''
    const email = contactEmail || ''
    const org = companyName || ''

    // Crear y descargar vCard
    const vcard = createVCard(name, title, email, cleanPhone, org)
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}.vcf`
    a.click()
    URL.revokeObjectURL(url)

    // Pequeña pausa para que se descargue el vCard, luego llamar
    setTimeout(() => {
      window.location.href = `tel:${cleanPhone}`
    }, 300)
  }

  const handleSaveFeedback = async () => {
    setSavingFeedback(true)
    setFeedbackSaved(false)
    try {
      await leadsApi.updateRejectionFeedback(assignment_id, rejectionFeedback)
      setFeedbackSaved(true)
      toast.success('Feedback guardado')
    } catch (_) {
      toast.error('Error al guardar el feedback')
    } finally {
      setSavingFeedback(false)
    }
  }

  const handleStatusChangeWithNote = (assignmentId, newStatus) => {
    onStatusChange?.(assignmentId, newStatus)
    if (newStatus !== 'pending' && newStatus !== 'closed') {
      setPendingCallNote({ status: newStatus, companyName: company?.name })
    }
  }

  if (!lead) return null
  const { company, assignment_id, status } = lead
  const displayPhone = revealedPhone || contact?.phone || company.phone
  const mobile = displayPhone
  const isRevealed = !!revealedPhone || contact?.phone_revealed
  const hasLusha = !!contact?.lusha_person_id
  const prefix = contact?.phone_prefix || ''
  const isMobile = isMobilePrefix(prefix)
  const oppStyle = OPP_STYLES[company.opportunity_level] || OPP_STYLES.media
  const opp = OPP_CONFIG[company.opportunity_level] || OPP_CONFIG.media
  const { sales, tech, content } = buildOpportunities(company)

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
    >
      <div
        className="relative bg-gradient-to-br from-surface-raised to-surface rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col animate-slide-up overflow-hidden"
        style={{
          border: `1px solid rgb(var(--color-surface-border))`,
          borderLeft: `3px solid ${opp.color}`,
          boxShadow: `0 20px 48px -12px rgba(0,0,0,0.6), -4px 0 24px -6px ${opp.color}50`,
        }}
      >

        {/* Top opp glow line */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
          style={{ background: `linear-gradient(90deg, ${opp.color}cc 0%, ${opp.color}40 40%, transparent 100%)` }} />

        {/* ── HEADER ── */}
        <div
          className="flex items-start justify-between p-4 sm:p-8 pb-5 border-b border-surface-border/60"
          style={{ background: `linear-gradient(135deg, ${opp.glow} 0%, rgba(var(--color-surface-raised)/0.4) 40%, transparent 100%)` }}
        >
          <div className="min-w-0 flex-1 flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-lg"
              style={{
                background: `linear-gradient(135deg, ${opp.color}30, ${opp.color}15)`,
                border: `1.5px solid ${opp.border}`,
                boxShadow: `0 4px 12px -2px ${opp.color}30`,
                color: opp.color,
              }}
            >
              {company.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-white leading-tight truncate mb-2">
                {company.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-medium">
                {company.city && <span>{company.city}</span>}
                {company.industry && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{company.industry}</span>
                  </>
                )}
                {company.website && (
                  <>
                    <span className="text-slate-600">·</span>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent hover:underline transition-colors"
                    >
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className={`text-3xl font-black leading-none ${scoreColor(company.digital_score)}`}>
                {company.digital_score}
                <span className="text-slate-500 text-base font-medium">/100</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Score digital</div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-hover transition-all hover:shadow-[0_0_12px_-2px_rgba(148,163,184,0.3)]"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Opportunity strip */}
        <div
          style={{
            background: `linear-gradient(90deg, ${opp.bg} 0%, transparent 80%)`,
            borderBottomColor: `${opp.border}`,
          }}
          className="border-b"
        >
          {/* Header row — always visible */}
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0"
              style={{
                color: opp.color,
                background: opp.bg,
                border: `1.5px solid ${opp.border}`,
                boxShadow: `0 0 10px -2px ${opp.color}40`,
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opp.color, boxShadow: `0 0 5px ${opp.color}` }} />
              Oportunidad {opp.label}
            </span>
            {company.opportunity_analysis && (
              <button
                type="button"
                onClick={() => setAnalysisOpen(v => !v)}
                className="ml-auto flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white transition-colors"
                aria-label={analysisOpen ? 'Ocultar análisis' : 'Ver análisis'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-3.5 h-3.5 transition-transform duration-200 ${analysisOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
          {/* Collapsible analysis */}
          {company.opportunity_analysis && (
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${analysisOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
              <p className="text-xs text-slate-300 leading-relaxed px-4 sm:px-6 pb-3">{company.opportunity_analysis}</p>
            </div>
          )}
        </div>


        {/* ── BODY scrollable ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-7">

          {/* DECISION MAKERS */}
          <section>
            <SectionLabel
              action={
                contact?.id && !editingContact ? (
                  <button
                    onClick={handleStartEditContact}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-surface-hover border border-surface-border transition-colors flex-shrink-0"
                  >
                    <PencilIcon />
                    Editar
                  </button>
                ) : null
              }
            >
              Decisor Clave
            </SectionLabel>

            {contact ? (
              <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl p-5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] hover:border-surface-border/80 transition-colors">
                {editingContact ? (
                  /* ── EDIT FORM ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                        <input
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cargo</label>
                        <input
                          type="text"
                          value={contactForm.title}
                          onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                          className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
                          placeholder="Cargo"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
                          placeholder="+34 6XX XXX XXX"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-accent/50 transition-colors"
                          placeholder="email@empresa.com"
                        />
                      </div>
                    </div>
                    {contactError && (
                      <p className="text-xs text-red-400">{contactError}</p>
                    )}
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={handleSaveContact}
                        disabled={savingContact}
                        className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-[0_4px_12px_-2px_rgba(79,142,247,0.3)] hover:shadow-[0_6px_16px_-2px_rgba(79,142,247,0.4)]"
                      >
                        {savingContact ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        onClick={handleCancelEditContact}
                        disabled={savingContact}
                        className="px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-surface-hover/80 border border-surface-border transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── READ VIEW ── */
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-black text-accent">
                            {contact.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{contact.name}</p>
                          {contact.title && (
                            <p className="text-xs text-slate-400 truncate">{contact.title}</p>
                          )}
                        </div>
                      </div>

                      {isRevealed && mobile ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCallWithContact(mobile, contact.name, contact.title, contact.email, company.name)
                          }}
                          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2.5 font-mono font-bold text-sm transition-colors flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                          </svg>
                          {mobile}
                        </button>
                      ) : !isRevealed && hasLusha ? (
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <button
                            onClick={handleRevealPhone}
                            disabled={revealing}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm border transition-colors
                              ${isMobile
                                ? 'bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/30 text-emerald-400'
                                : 'bg-surface-raised hover:bg-surface-hover border-surface-border text-slate-300'
                              } disabled:opacity-50`}
                          >
                            {revealing ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <EyeIcon />
                            )}
                            {revealing ? 'Revelando…' : (
                              prefix
                                ? <>Revelar <span className="font-mono">{prefix}X…</span></>
                                : 'Revelar móvil'
                            )}
                          </button>
                          {isMobile && !revealing && (
                            <span className="text-[10px] text-emerald-400/70">Móvil detectado</span>
                          )}
                          {revealError && (
                            <span className="text-[10px] text-red-400">{revealError}</span>
                          )}
                        </div>
                      ) : mobile ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCallWithContact(mobile, contact.name, contact.title, contact.email, company.name)
                          }}
                          className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-xl px-4 py-2.5 font-mono font-bold text-sm transition-colors flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                          </svg>
                          {mobile}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Móvil no disponible</span>
                      )}
                    </div>

                    {contact.phone2 && (
                      <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-500 flex-shrink-0">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                          </svg>
                          <span className="text-xs text-slate-500">Teléfono 2</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCallWithContact(contact.phone2, contact.name, contact.title, contact.email, company.name)
                          }}
                          className="flex items-center gap-1.5 text-accent font-mono text-sm hover:underline"
                        >
                          {contact.phone2}
                        </button>
                      </div>
                    )}

                    {contact.email && (
                      <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-500 flex-shrink-0">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <a href={`mailto:${contact.email}`} className="text-sm text-accent hover:underline truncate">
                          {contact.email}
                        </a>
                      </div>
                    )}

                    {mobile && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <button
                          onClick={saveToContacts}
                          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                          </svg>
                          Guardar en mis contactos
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl p-4 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                <p className="text-sm text-slate-500 italic">No hay contacto registrado para esta empresa.</p>
                {company.phone && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCallWithContact(company.phone, company.name, '', '', company.name)
                    }}
                    className="mt-2 flex items-center gap-2 text-accent text-sm font-mono hover:underline cursor-pointer bg-none border-none p-0"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                    </svg>
                    {company.phone}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ECOSISTEMA DIGITAL */}
          <section>
            <SectionLabel>Ecosistema Digital — Diagnóstico</SectionLabel>
            <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl divide-y divide-surface-border/40 px-4 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
              <DiagRow
                label="Presencia web"
                value={`DFTMO Score ${company.digital_score}/100`}
                note={company.website || undefined}
              />
              <DiagRow label="Redes Sociales"    active={company.redes_sociales} />
              <DiagRow label="CRM / Email"        active={company.email_marketing} />
              <DiagRow label="Captación Leads"    active={company.captacion_leads} />
              <DiagRow label="SEO"                active={company.seo_info} />
              <DiagRow label="Contenido en vídeo" active={company.video_contenido} />
            </div>
          </section>

          {/* SALES OPPORTUNITIES */}
          <section>
            <SectionLabel>Oportunidades de Venta</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <OppColumn title="Sales / CRM"  icon="💼" items={sales} />
              <OppColumn title="Tech / IA"    icon="⚡" items={tech} />
              <OppColumn title="Contenido AV" icon="🎬" items={content} />
            </div>
          </section>

          {/* FRASES DE APERTURA */}
          {company.opening_lines?.length > 0 && (
            <section>
              <SectionLabel>Frases de Apertura</SectionLabel>
              <div className="mb-3 flex items-center gap-2.5 px-3 py-2.5 bg-accent/8 border border-accent/20 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-accent">
                    {comercialName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Script personalizado para <span className="font-bold text-accent">{comercialName}</span> · {company.name}
                </p>
              </div>
              <ol className="space-y-2">
                {company.opening_lines.map((line, i) => {
                  const personalizedLine = line
                    .replace(/\[YOUR NAME\]/gi, comercialName)
                  return (
                    <li key={i} className="flex gap-3 p-3.5 bg-surface-card border border-surface-border rounded-xl hover:border-accent/20 transition-colors group">
                      <span className="w-5 h-5 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-accent">{i + 1}</span>
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed">{personalizedLine}</p>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {/* HOOKS */}
          {company.hooks?.length > 0 && (
            <section>
              <SectionLabel>Hooks de Conversación</SectionLabel>
              <ul className="space-y-2">
                {company.hooks.map((hook, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-400">
                    <span className="text-accent flex-shrink-0 mt-0.5">›</span>
                    <span>{hook}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* RECORDATORIOS DE LLAMADA */}
          <section>
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-accent">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Recordatorios de Llamada
              </span>
            </SectionLabel>
            <RemindersList
              reminders={reminders}
              loading={remindersLoading}
              onAdd={addReminder}
              onEdit={editReminder}
              onDelete={deleteReminder}
            />
          </section>

          {/* HISTORIAL DE LLAMADAS (Feature 4) */}
          {(callLogs.length > 0 || callLogsLoading) && (
            <section>
              <SectionLabel>Historial de llamadas</SectionLabel>
              {callLogsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-12 bg-surface-border/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {callLogs.map((log) => {
                    const date = new Date(log.called_at)
                    const now = new Date()
                    const diffMs = now - date
                    const diffH = Math.floor(diffMs / 3600000)
                    const diffD = Math.floor(diffMs / 86400000)
                    const timeLabel =
                      diffH < 1 ? 'Ahora'
                      : diffH < 24 ? `Hace ${diffH}h`
                      : diffD === 1 ? 'Ayer'
                      : `Hace ${diffD} días`

                    const statusColors = {
                      closed:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                      rejected:  'text-red-400 bg-red-400/10 border-red-400/20',
                      no_answer: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
                      call_later:'text-blue-400 bg-blue-400/10 border-blue-400/20',
                      pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
                    }
                    const statusLabel = {
                      closed: 'Agendado', rejected: 'Rechazado',
                      no_answer: 'Sin resp.', call_later: 'Llamar luego', pending: 'Pendiente',
                    }

                    return (
                      <div key={log.id} className="flex gap-3 p-3 bg-gradient-to-r from-surface-card to-surface border border-surface-border/60 rounded-xl shadow-[0_2px_8px_-1px_rgba(0,0,0,0.15)]">
                        <div className="w-7 h-7 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-400">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`badge border text-[10px] ${statusColors[log.status_at] || statusColors.pending}`}>
                              {statusLabel[log.status_at] || log.status_at}
                            </span>
                            <span className="text-[10px] text-slate-600">{timeLabel}</span>
                          </div>
                          {log.note && (
                            <p className="text-xs text-slate-400 leading-relaxed">{log.note}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* INFORME IA */}
          <section>
            <SectionLabel
              action={
                report ? (
                  <button
                    onClick={() => handleGenerateReport(true)}
                    disabled={reportLoading}
                    className="text-xs text-slate-400 hover:text-accent transition-colors flex-shrink-0 font-semibold"
                  >
                    Regenerar
                  </button>
                ) : null
              }
            >
              Informe Comercial IA
            </SectionLabel>

            {!report ? (
              <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl p-5 text-center shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                <div className="text-2xl mb-2">🧠</div>
                <p className="text-sm text-slate-400 mb-1">Análisis completo de la empresa</p>
                <p className="text-xs text-slate-600 mb-4">Dolores, argumentario, objeciones y plan de cierre personalizado</p>
                {reportError && (
                  <p className="text-xs text-red-400 mb-3">{reportError}</p>
                )}
                <button
                  onClick={() => handleGenerateReport(false)}
                  disabled={reportLoading}
                  className="btn-primary text-sm flex items-center gap-2 mx-auto"
                >
                  {reportLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando informe…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                        <path d="M12 12l8.5-8.5" />
                      </svg>
                      Generar Informe IA
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                {reportCached && (
                  <div className="px-4 py-2 bg-amber-400/5 border-b border-surface-border flex items-center justify-between">
                    <span className="text-[10px] text-amber-400/70">Informe en caché</span>
                    <button
                      onClick={() => handleGenerateReport(true)}
                      disabled={reportLoading}
                      className="text-[10px] text-slate-500 hover:text-accent transition-colors"
                    >
                      Regenerar con IA →
                    </button>
                  </div>
                )}
                <div className="p-5 prose-sm max-w-none overflow-y-auto max-h-[500px]">
                  <ReportContent content={report} />
                </div>
              </div>
            )}
          </section>

          {/* INTELIGENCIA DEL SECTOR */}
          <section>
            <button
              onClick={() => setSectorOpen(o => !o)}
              className="w-full flex items-center gap-4 mb-0 group"
              aria-expanded={sectorOpen}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-1 h-6 bg-gradient-to-b from-violet-400 to-violet-400/40 rounded-full" />
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  Inteligencia del Sector
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/20 text-violet-300 font-semibold">
                  CI-OS
                </span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${sectorOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {sectorOpen && (
                <motion.div
                  key="sector-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4">
                    {!sectorData && !sectorLoading && (
                      <div className="bg-gradient-to-br from-surface-card to-surface border border-violet-500/20 rounded-xl p-5 text-center shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                        <div className="text-2xl mb-2">🔭</div>
                        <p className="text-sm text-slate-400 mb-1">Análisis competitivo del sector</p>
                        <p className="text-xs text-slate-600 mb-4">
                          Competidores detectados, gaps de mercado y recomendaciones de servicios
                        </p>
                        {sectorError && (
                          <p className="text-xs text-red-400 mb-3">{sectorError}</p>
                        )}
                        <button
                          onClick={handleSectorAnalysis}
                          disabled={sectorLoading}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-violet-300 font-semibold text-sm transition-all shadow-[0_4px_12px_-2px_rgba(139,92,246,0.2)] hover:shadow-[0_6px_16px_-2px_rgba(139,92,246,0.3)]"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Analizar sector con IA
                        </button>
                      </div>
                    )}

                    {sectorLoading && (
                      <div className="bg-gradient-to-br from-surface-card to-surface border border-violet-500/20 rounded-xl p-6 flex flex-col items-center gap-3 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                        <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-400">Analizando competidores...</p>
                        <p className="text-xs text-slate-600">Esto puede tardar unos segundos</p>
                      </div>
                    )}

                    {sectorData && !sectorLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-4"
                      >
                        {/* Competidores detectados */}
                        {sectorData.competitors?.length > 0 && (
                          <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                            <div className="px-4 py-3 border-b border-surface-border/50 bg-surface-raised/40">
                              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                                🏢 Competidores detectados
                              </span>
                            </div>
                            <div className="divide-y divide-surface-border/40">
                              {sectorData.competitors.map((comp, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover/20 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{comp.name}</p>
                                    {comp.website && (
                                      <a
                                        href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[11px] text-accent/70 hover:text-accent hover:underline truncate block"
                                      >
                                        {comp.website.replace(/^https?:\/\//, '')}
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    {comp.digitalScore !== undefined && (
                                      <span className={`text-xs font-bold ${comp.digitalScore >= 65 ? 'text-emerald-400' : comp.digitalScore >= 35 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {comp.digitalScore}/100
                                      </span>
                                    )}
                                    {comp.hasAds !== undefined && (
                                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                        comp.hasAds
                                          ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                                          : 'text-slate-500 bg-surface-card border-surface-border'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${comp.hasAds ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                        {comp.hasAds ? 'Ads activos' : 'Sin ads'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Oportunidades del sector */}
                        {sectorData.opportunities?.length > 0 && (
                          <div className="bg-gradient-to-br from-surface-card to-surface border border-emerald-500/20 rounded-xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                            <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                                ✨ Oportunidades del sector
                              </span>
                            </div>
                            <ul className="p-4 space-y-2">
                              {sectorData.opportunities.map((opp, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">›</span>
                                  <span>{opp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {sectorData.recommendations?.length > 0 && (
                          <div className="bg-gradient-to-br from-surface-card to-surface border border-accent/20 rounded-xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                            <div className="px-4 py-3 border-b border-accent/20 bg-accent/5">
                              <span className="text-xs font-black text-accent uppercase tracking-wider">
                                💡 Recomendaciones
                              </span>
                            </div>
                            <ul className="p-4 space-y-2">
                              {sectorData.recommendations.map((rec, i) => {
                                const serviceTag = rec.service
                                  ? (
                                    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${
                                      rec.service === 'SALES'
                                        ? 'bg-blue-400/10 text-blue-300 border border-blue-400/20'
                                        : rec.service === 'MEDIA'
                                        ? 'bg-purple-400/10 text-purple-300 border border-purple-400/20'
                                        : 'bg-orange-400/10 text-orange-300 border border-orange-400/20'
                                    }`}>{rec.service}</span>
                                  ) : null
                                const text = typeof rec === 'string' ? rec : rec.text
                                return (
                                  <li key={i} className="flex gap-2 text-sm text-slate-300 leading-relaxed">
                                    <span className="text-accent mt-0.5 flex-shrink-0">›</span>
                                    <span>{serviceTag}{text}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Fallback: raw text if CI-OS returns a different shape */}
                        {!sectorData.competitors && !sectorData.opportunities && !sectorData.recommendations && (
                          <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl p-5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {typeof sectorData === 'string' ? sectorData : JSON.stringify(sectorData, null, 2)}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => { setSectorData(null); setSectorError(null) }}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Volver a analizar →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* NOTAS DEL COMERCIAL */}
          <section>
            <SectionLabel
              action={
                notesSaved && !savingNotes ? (
                  <span className="text-xs text-emerald-400 flex-shrink-0 font-semibold">✓ Guardado</span>
                ) : (
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent/90 disabled:opacity-50 text-white transition-all shadow-[0_4px_12px_-2px_rgba(79,142,247,0.3)] hover:shadow-[0_6px_16px_-2px_rgba(79,142,247,0.4)] flex-shrink-0"
                  >
                    {savingNotes ? 'Guardando...' : 'Guardar nota'}
                  </button>
                )
              }
            >
              Notas del Comercial
            </SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
              placeholder="Escribe tus notas aquí..."
              rows={5}
              className="w-full bg-surface-raised border border-surface-border/60 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-accent/50 focus:shadow-[0_0_12px_-2px_rgba(79,142,247,0.3)] font-mono leading-relaxed transition-all"
            />
          </section>
        </div>

        {/* ── REJECTION FEEDBACK ── */}
        {status === 'rejected' && (
          <div className="px-8 py-4 border-t border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                ¿Por qué fue rechazado?
              </span>
              {feedbackSaved && !savingFeedback && (
                <span className="text-xs text-emerald-400 font-semibold">✓ Guardado</span>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={rejectionFeedback}
                onChange={(e) => { setRejectionFeedback(e.target.value); setFeedbackSaved(false) }}
                placeholder="Explica el motivo del rechazo: no interesado, ya tiene proveedor, presupuesto..."
                rows={2}
                className="flex-1 bg-surface-raised border border-red-500/20 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:border-red-400/40 transition-all font-mono leading-relaxed"
              />
              <button
                onClick={handleSaveFeedback}
                disabled={savingFeedback || !rejectionFeedback.trim()}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all disabled:opacity-40 flex-shrink-0"
              >
                {savingFeedback ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* ── FOOTER: status ── */}
        <div className="px-8 py-5 border-t border-surface-border/60 bg-gradient-to-r from-surface-raised/50 to-transparent">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estado del lead</span>
            <StatusBar
              assignmentId={assignment_id}
              currentStatus={status}
              onStatusChange={handleStatusChangeWithNote}
            />
          </div>
        </div>

        {/* ── CallNoteSheet overlay (Feature 4 + 8) ── */}
        {pendingCallNote && (
          <CallNoteSheet
            assignmentId={assignment_id}
            companyName={pendingCallNote.companyName}
            newStatus={pendingCallNote.status}
            onSave={() => { setPendingCallNote(null); refetchLogs() }}
            onDismiss={() => setPendingCallNote(null)}
            onAddReminder={addReminder}
          />
        )}
      </div>
    </div>
  )
}
