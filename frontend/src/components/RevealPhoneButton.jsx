import { useState } from 'react'

function formatTimeAgo(isoString) {
  if (!isoString) return null
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return 'ahora mismo'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function EyeClosedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/**
 * RevealPhoneButton — Three-state button: idle → loading → revealed.
 *
 * Props:
 *   phone        {string|null}   — revealed phone number (null = not yet revealed)
 *   loading      {boolean}       — reveal in progress
 *   error        {string|null}   — error message
 *   revealed_at  {string|null}   — ISO timestamp of when phone was revealed
 *   revealed     {boolean}       — whether phone has been revealed
 *   onReveal     {function}      — called when user clicks the eye button
 *   prefix       {string}        — partial prefix hint e.g. "+34 6XX…"
 *   isMobile     {boolean}       — whether the prefix indicates a mobile
 *   size         {'sm'|'md'}     — compact vs full
 */
export default function RevealPhoneButton({
  phone = null,
  loading = false,
  error = null,
  revealed_at = null,
  revealed = false,
  onReveal,
  prefix = '',
  isMobile = false,
  size = 'md',
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    if (!phone) return
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available — silent fail
    }
  }

  const timeAgo = formatTimeAgo(revealed_at)
  const isSmall = size === 'sm'

  // ── REVEALED state ──────────────────────────────────────────────────────────
  if (revealed && phone) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-mono font-semibold transition-colors
              ${isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
          >
            <EyeIcon />
            {phone}
          </a>
          <button
            onClick={handleCopy}
            title="Copiar número"
            aria-label="Copiar número al portapapeles"
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-surface-border bg-surface-raised hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        {timeAgo && (
          <span className="text-[10px] text-slate-500">Revelado {timeAgo}</span>
        )}
      </div>
    )
  }

  // ── LOADING state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <button
        disabled
        className={`flex items-center gap-1.5 bg-surface-raised border border-surface-border rounded-lg text-slate-400 opacity-70 cursor-not-allowed
          ${isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
      >
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Revelando…
      </button>
    )
  }

  // ── IDLE state (not yet revealed) ───────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onReveal?.() }}
        title={isMobile ? 'Móvil detectado — revelar número completo' : 'Revelar número vía Lusha'}
        aria-label="Revelar número de teléfono"
        className={`flex items-center gap-1.5 rounded-lg font-semibold border transition-colors
          ${isMobile
            ? 'bg-emerald-400/10 hover:bg-emerald-400/20 border-emerald-400/30 text-emerald-400'
            : 'bg-surface-raised hover:bg-surface-hover border-surface-border text-slate-400 hover:text-white'
          }
          ${isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
      >
        <EyeClosedIcon />
        {prefix ? `${prefix}…` : 'Revelar'}
      </button>
      {isMobile && (
        <span className="text-[10px] text-emerald-400/70">Móvil detectado</span>
      )}
      {error && (
        <span className="text-[10px] text-red-400 max-w-[160px] text-right">{error}</span>
      )}
    </div>
  )
}
