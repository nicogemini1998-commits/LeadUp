import { useState } from 'react'
import { leadsApi } from '../lib/api'

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden animate-pulse">
      <div className="h-14 bg-red-400/10 border-b border-surface-border" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-surface-border rounded w-3/4" />
        <div className="h-3 bg-surface-border rounded w-1/2" />
      </div>
    </div>
  )
}

function ObjectionCard({ objection, rebuttal, index }) {
  return (
    <div className="bg-gradient-to-br from-surface-card to-surface border border-surface-border/60 rounded-xl overflow-hidden shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]">
      {/* Objection — red zone */}
      <div className="flex items-start gap-3 p-4 bg-red-400/5 border-b border-red-400/15">
        <span className="w-5 h-5 rounded-full bg-red-400/20 border border-red-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[9px] font-black text-red-400">{index + 1}</span>
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-black text-red-400/70 uppercase tracking-wider mb-1">El cliente dice</p>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">"{objection}"</p>
        </div>
      </div>
      {/* Rebuttal — green zone */}
      <div className="flex items-start gap-3 p-4 bg-emerald-400/5">
        <span className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-emerald-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-wider mb-1">Tú respondes</p>
          <p className="text-sm text-emerald-300/90 leading-relaxed">{rebuttal}</p>
        </div>
      </div>
    </div>
  )
}

export default function ObjectionsSection({ assignmentId, industry }) {
  const [objections, setObjections] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)

  const generate = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await leadsApi.getObjections(assignmentId, force)
      setObjections(res.data.objections)
      setCached(res.data.cached)
    } catch {
      setError('Error generando objeciones. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap flex items-center gap-1.5">
          <SparkleIcon />
          Objeciones del Sector
        </span>
        <div className="flex-1 h-px bg-surface-border" />
        {objections && !loading && (
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-accent transition-colors flex-shrink-0"
          >
            Regenerar
          </button>
        )}
      </div>

      {/* Empty state */}
      {!objections && !loading && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 text-accent">
            <SparkleIcon />
          </div>
          <p className="text-sm text-slate-300 font-medium mb-1">
            Objeciones de {industry || 'este sector'}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Las 3 objeciones más habituales en cold calling + cómo rebatirlas
          </p>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button
            onClick={() => generate(false)}
            className="btn-primary text-sm mx-auto flex items-center gap-2"
          >
            <SparkleIcon />
            Generar objeciones IA
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Results */}
      {objections && !loading && (
        <div className="space-y-3">
          {cached && (
            <p className="text-[10px] text-slate-600 text-right">
              Desde caché ·{' '}
              <button
                onClick={() => generate(true)}
                className="hover:text-accent transition-colors"
              >
                Regenerar con IA →
              </button>
            </p>
          )}
          {objections.map((obj, i) => (
            <ObjectionCard
              key={i}
              index={i}
              objection={obj.objection}
              rebuttal={obj.rebuttal}
            />
          ))}
        </div>
      )}
    </div>
  )
}
