import { useState } from 'react'

// ── Badge config ──────────────────────────────────────────────────────────────

const LEVEL_STYLES = {
  alta:  { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', label: '↑ Alta' },
  media: { cls: 'text-amber-400 bg-amber-400/10 border-amber-400/30',       label: '→ Media' },
  baja:  { cls: 'text-slate-400 bg-slate-400/10 border-slate-400/30',       label: '↓ Baja' },
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CopyIcon({ copied }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 12l8.5-8.5" />
    </svg>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent fail if clipboard unavailable
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      aria-label="Copiar al portapapeles"
      className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-hover transition-colors"
    >
      <CopyIcon copied={copied} />
    </button>
  )
}

function SkeletonLine({ w = 'full' }) {
  return (
    <div className={`h-3 rounded bg-surface-border/60 animate-pulse w-${w}`} />
  )
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 p-4">
      <SkeletonLine w="1/3" />
      <SkeletonLine w="full" />
      <SkeletonLine w="4/5" />
      <div className="pt-2 space-y-2">
        <SkeletonLine w="2/3" />
        <SkeletonLine w="3/4" />
        <SkeletonLine w="1/2" />
      </div>
      <div className="pt-2 space-y-2">
        <SkeletonLine w="full" />
        <SkeletonLine w="4/5" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * OpportunitiesSection — Sales opportunities panel.
 *
 * Props:
 *   enrichment   {object|null}   — enrichment data: { opportunity_level, opportunity_reason,
 *                                   hooks, opening_lines, call_to_action, generated_at }
 *   loading      {boolean}
 *   error        {string|null}
 *   cached       {boolean}       — true if enrichment is < 1h old from cache
 *   onGenerate   {function}      — called when "Generar inteligencia" is clicked
 *   onRegenerate {function}      — called when "Regenerar" is clicked
 */
export default function OpportunitiesSection({
  enrichment = null,
  loading = false,
  error = null,
  cached = false,
  onGenerate,
  onRegenerate,
}) {
  const level = enrichment?.opportunity_level
  const levelStyle = LEVEL_STYLES[level] || LEVEL_STYLES.media

  return (
    <section aria-labelledby="opp-heading">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 id="opp-heading" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
            Oportunidades de Venta
          </h3>
          {cached && enrichment && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400/80 border border-amber-400/20">
              Cache
            </span>
          )}
        </div>

        {enrichment && !loading && (
          <button
            onClick={onRegenerate}
            className="text-[10px] text-slate-500 hover:text-accent transition-colors"
          >
            Regenerar
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
          <SkeletonLoader />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button
            onClick={onGenerate}
            className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !enrichment && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <p className="text-sm text-slate-400 mb-1">Inteligencia comercial personalizada</p>
          <p className="text-xs text-slate-600 mb-4">
            Hooks, frases de apertura y call-to-action generados por IA para esta empresa
          </p>
          <button
            onClick={onGenerate}
            className="btn-primary text-sm flex items-center gap-2 mx-auto"
          >
            <SparkIcon />
            Generar inteligencia
          </button>
        </div>
      )}

      {/* Enrichment content */}
      {!loading && !error && enrichment && (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">

          {/* Level badge + reason */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border/50">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${levelStyle.cls}`}>
              {levelStyle.label}
            </span>
            {enrichment.opportunity_reason && (
              <p className="text-xs text-slate-400 line-clamp-1 flex-1">
                {enrichment.opportunity_reason}
              </p>
            )}
          </div>

          <div className="p-4 space-y-5">
            {/* Hooks */}
            {enrichment.hooks?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                  Hooks
                </p>
                <ul className="space-y-2">
                  {enrichment.hooks.map((hook, i) => (
                    <li key={i} className="flex items-start gap-2 group">
                      <span className="text-accent flex-shrink-0 mt-0.5 text-xs font-bold">›</span>
                      <span className="text-sm text-slate-300 leading-relaxed flex-1">{hook}</span>
                      <CopyButton text={hook} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opening lines */}
            {enrichment.opening_lines?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                  Opening lines
                </p>
                <ol className="space-y-2">
                  {enrichment.opening_lines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 group">
                      <span className="text-xs font-black text-accent flex-shrink-0 w-4 mt-0.5">{i + 1}</span>
                      <span className="text-sm text-slate-300 leading-relaxed flex-1 italic">
                        "{line}"
                      </span>
                      <CopyButton text={line} />
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Call to action */}
            {enrichment.call_to_action && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  Call to action
                </p>
                <div className="flex items-start gap-2 group">
                  <p className="text-sm text-slate-300 leading-relaxed flex-1">
                    {enrichment.call_to_action}
                  </p>
                  <CopyButton text={enrichment.call_to_action} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
