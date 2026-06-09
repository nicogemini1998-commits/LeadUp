import { useState } from 'react'
import StatusBar from './StatusBar'
import { leadsApi } from '../lib/api'

const OPP_CONFIG = {
  alta:  { label: 'Alta',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  media: { label: 'Media', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  baja:  { label: 'Baja',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
}

function scoreColor(s) {
  if (s >= 65) return '#10b981'
  if (s >= 35) return '#f59e0b'
  return '#ef4444'
}

function formatWA(phone) {
  if (!phone) return null
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('34') && d.length === 11) return d
  if (d.length === 9) return '34' + d
  return d.length >= 10 ? d : null
}

function isMobile(prefix) {
  if (!prefix) return false
  const p = prefix.replace(/\D/g, '')
  return p.startsWith('6') || p.startsWith('7')
}

function followUpBadge(date) {
  if (!date) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(date + 'T00:00:00')
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0)   return { label: 'Vencido', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)' }
  if (diff === 0) return { label: 'Hoy',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' }
  if (diff === 1) return { label: 'Mañana',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)' }
  return { label: due.toLocaleDateString('es-ES', { day:'numeric', month:'short' }), color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' }
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatDomain(url) {
  if (!url) return null
  try {
    let u = url
    if (!u.startsWith('http')) u = 'https://' + u
    let host = new URL(u).hostname.replace(/^www\./, '')
    if (host.length > 24) host = host.slice(0, 24) + '…'
    return host
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].slice(0, 24)
  }
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 7.09 7.09l.41-.41a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z" />
    </svg>
  )
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 8, height: 8 }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 8, height: 8 }}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function ScoreArc({ score, hovered }) {
  const c = scoreColor(score)
  const pct = Math.min(100, Math.max(0, score))
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div
      className="relative flex-shrink-0"
      style={{
        width: 52, height: 52,
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 200ms ease',
      }}
    >
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(var(--color-surface-border) / 0.4)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={c} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${c}80)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black tabular-nums leading-none" style={{ color: c }}>{score}</span>
        <span className="font-semibold uppercase leading-none mt-0.5" style={{ fontSize: 6, letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Digital</span>
      </div>
    </div>
  )
}

const CAPS = [
  { key: 'redes_sociales',  label: 'Redes' },
  { key: 'captacion_leads', label: 'Captación' },
  { key: 'email_marketing', label: 'Email' },
  { key: 'video_contenido', label: 'Video' },
  { key: 'seo_info',        label: 'SEO' },
]

export default function CompanyCard({ lead, onClick, onStatusChange, onPhoneRevealed }) {
  const { company, contact, assignment_id, status, follow_up_date, notes } = lead
  const [revealedPhone, setRevealedPhone] = useState(contact?.phone_revealed ? contact.phone : null)
  const [revealing, setRevealing] = useState(false)
  const [hovered, setHovered] = useState(false)

  const opp = OPP_CONFIG[company.opportunity_level] || OPP_CONFIG.media
  const isRevealed = !!revealedPhone || !!contact?.phone_revealed
  const displayPhone = revealedPhone || contact?.phone || company.phone
  const waNum = formatWA(displayPhone)
  const openingLine = company.opening_lines?.[0] || ''
  const waUrl = waNum ? `https://wa.me/${waNum}${openingLine ? `?text=${encodeURIComponent(openingLine)}` : ''}` : null
  const badge = followUpBadge(follow_up_date)
  const prefix = contact?.phone_prefix || ''
  const domain = formatDomain(company.website)

  const handleReveal = async (e) => {
    e.stopPropagation()
    if (revealing || isRevealed) return
    setRevealing(true)
    try {
      const res = await leadsApi.revealPhone(assignment_id)
      const phone = res.data.phone
      setRevealedPhone(phone)
      onPhoneRevealed?.(assignment_id, phone)
    } catch (err) {
      console.error('Reveal failed:', err)
    } finally {
      setRevealing(false)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(lead)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(lead)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer animate-fade-in relative overflow-hidden rounded-2xl"
      style={{
        background: 'rgb(var(--color-surface-card))',
        border: hovered
          ? `1px solid rgba(124,58,237,0.5)`
          : '1px solid rgb(var(--color-surface-border) / 0.6)',
        borderLeft: `3px solid ${opp.color}`,
        boxShadow: hovered
          ? `0 0 0 1px rgba(124,58,237,0.12), 0 20px 40px -12px rgba(0,0,0,0.25), 0 0 60px -20px rgba(124,58,237,0.2), -4px 0 20px -4px ${opp.color}50`
          : `0 2px 12px -4px rgba(0,0,0,0.15), -3px 0 12px -4px ${opp.color}40`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border 200ms ease, box-shadow 200ms ease, transform 200ms ease',
      }}
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: hovered
            ? 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.9) 40%, rgba(167,139,250,0.6) 60%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.3) 50%, transparent 100%)',
          transition: 'opacity 200ms ease',
        }} />

      {/* Opp glow on top-left corner accent */}
      <div className="absolute top-0 left-0 w-20 pointer-events-none"
        style={{ height: 1, background: `linear-gradient(90deg, ${opp.color}cc 0%, transparent 100%)` }} />

      {/* Opp color ambient — always visible on left, stronger on hover */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: hovered
            ? `radial-gradient(ellipse at 0% 50%, ${opp.color}14 0%, transparent 55%), radial-gradient(ellipse at 20% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)`
            : `radial-gradient(ellipse at 0% 50%, ${opp.color}08 0%, transparent 45%)`,
          transition: 'background 300ms ease',
        }} />

      <div className="relative">

        {/* ── SECTION 1: Header ── */}
        <div className="p-4 pb-2">
          <div className="flex items-start gap-3">
            <ScoreArc score={company.digital_score} hovered={hovered} />

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] leading-tight truncate"
                style={{
                  color: hovered ? '#c4b5fd' : 'var(--text-primary)',
                  transition: 'color 200ms ease',
                }}>
                {company.name}
              </h3>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {[company.city, company.industry].filter(Boolean).join(' · ')}
              </p>
              {domain && (
                <a
                  href={company.website.startsWith('http') ? company.website : 'https://' + company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 mt-1 rounded-md px-1.5 py-0.5 text-[10px]"
                  style={{
                    background: 'rgb(var(--color-surface-raised))',
                    border: '1px solid rgb(var(--color-surface-border) / 0.6)',
                    color: 'var(--text-faint)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLinkIcon />
                  <span>{domain}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Badges ── */}
        <div className="px-4 mb-2 flex flex-wrap gap-1.5 items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{
              color: opp.color,
              background: opp.bg,
              border: `1.5px solid ${opp.border}`,
              boxShadow: `0 0 10px -2px ${opp.color}40, inset 0 1px 0 ${opp.color}20`,
            }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: opp.color, boxShadow: `0 0 6px ${opp.color}` }} />
            {opp.label}
          </span>
          {badge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
              ⏰ {badge.label}
            </span>
          )}
        </div>

        {/* ── SECTION 3: Contact block ── */}
        <div className="px-4 mb-2">
          <div className="rounded-xl p-3"
            style={{
              background: hovered ? 'rgba(124,58,237,0.07)' : 'rgb(var(--color-surface-raised) / 0.6)',
              border: hovered ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgb(var(--color-surface-border) / 0.5)',
              transition: 'background 200ms ease, border 200ms ease',
            }}>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--text-faint)' }}>
              Contacto
            </p>

            {contact?.name ? (
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black"
                  style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa' }}>
                  {getInitials(contact.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {contact.name}
                  </p>
                  {contact.title && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{contact.title}</p>
                  )}
                  {contact.email && (
                    <p className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                      <EnvelopeIcon />
                      <span className="truncate" style={{ maxWidth: 160 }}>
                        {contact.email.length > 22 ? contact.email.slice(0, 22) + '…' : contact.email}
                      </span>
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isRevealed ? (
                    <>
                      <a href={`tel:${displayPhone}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105"
                        style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                        title={displayPhone}>
                        <PhoneIcon />
                      </a>
                      {waUrl && (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105"
                          style={{ background: 'rgba(37,211,102,0.12)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}
                          title="WhatsApp">
                          <WaIcon />
                        </a>
                      )}
                    </>
                  ) : contact?.lusha_person_id ? (
                    <button onClick={handleReveal} disabled={revealing}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition-all duration-200 disabled:opacity-50 hover:scale-105"
                      style={isMobile(prefix)
                        ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
                      {revealing
                        ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <EyeIcon />}
                      {prefix ? `${prefix}···` : 'Revelar'}
                    </button>
                  ) : displayPhone ? (
                    <a href={`tel:${displayPhone}`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105"
                      style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                      title={displayPhone}>
                      <PhoneIcon />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Sin contacto asignado</p>
                {displayPhone && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <a href={`tel:${displayPhone}`}
                      className="flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{ background: 'rgba(124,58,237,0.18)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                      <PhoneIcon />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 4: Digital capacity indicators ── */}
        {company.digital_score > 0 && (
          <div className="px-4 mb-2 flex flex-wrap gap-x-3 gap-y-1">
            {CAPS.map(({ key, label }) => {
              const active = !!company[key]
              return (
                <div key={key} className="flex items-center gap-1">
                  <span className="rounded-full flex-shrink-0" style={{
                    width: 5, height: 5, display: 'inline-block',
                    background: active ? '#10b981' : 'rgb(var(--color-surface-border))',
                    boxShadow: active ? '0 0 4px #10b98166' : 'none',
                  }} />
                  <span className="text-[9px]" style={{ color: active ? 'var(--text-muted)' : 'var(--text-faint)' }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── SECTION 5: Hook ── */}
        {company.hooks?.length > 0 && (
          <div className="mx-4 pl-2.5 py-1 mb-2"
            style={{ borderLeft: `2px solid ${opp.color}` }}>
            <p className="line-clamp-2 leading-relaxed"
              style={{ fontSize: '11.5px', color: 'var(--text-muted)', opacity: 0.8 }}>
              {company.hooks[0]}
            </p>
          </div>
        )}

        {/* ── SECTION 6: Notes ── */}
        {notes && (
          <div className="mx-4 flex items-start gap-2 rounded-lg px-3 py-2 mb-2"
            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-amber-400 flex-shrink-0 mt-0.5" style={{ width: 12, height: 12 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'rgba(251,191,36,0.6)' }}>
              {notes}
            </p>
          </div>
        )}

        {/* ── SECTION 7: Separator + StatusBar ── */}
        <div style={{ borderTop: '1px solid rgb(var(--color-surface-border) / 0.4)' }} />
        <div className="px-4 pb-4 pt-2" onClick={(e) => e.stopPropagation()}>
          <StatusBar
            assignmentId={assignment_id}
            currentStatus={status}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>
    </article>
  )
}
