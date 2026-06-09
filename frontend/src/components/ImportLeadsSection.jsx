import { useState, useRef } from 'react'
import { importApi } from '../lib/api'
import { toast } from '../lib/toast'

const STEPS = [
  { id: 1, label: 'Subir archivo' },
  { id: 2, label: 'Validar datos' },
  { id: 3, label: 'Distribuir' },
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const done = s.id < current
        const active = s.id === current
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                style={{
                  background: done ? '#10b981' : active ? '#7c3aed' : 'rgb(var(--color-surface-raised))',
                  color: done || active ? '#fff' : 'var(--text-muted)',
                  border: done || active ? 'none' : '1px solid rgb(var(--color-surface-border) / 0.6)',
                  boxShadow: active ? '0 0 16px rgba(124,58,237,0.6)' : done ? '0 0 10px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                {done ? '✓' : s.id}
              </div>
              <span className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: active ? '#c4b5fd' : done ? '#6ee7b7' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-4 transition-all duration-500"
                style={{ background: done ? 'rgba(16,185,129,0.5)' : 'rgb(var(--color-surface-border) / 0.5)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function UploadZone({ onFile, loading }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) onFile(file)
    else toast('error', 'Solo .xlsx, .xls o .csv')
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onClick={() => inputRef.current?.click()}
      className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 p-8 text-center"
      style={{
        background: drag ? 'rgba(124,58,237,0.08)' : 'rgb(var(--color-surface-raised) / 0.5)',
        border: drag ? '2px dashed rgba(124,58,237,0.7)' : '2px dashed rgb(var(--color-surface-border) / 0.7)',
        boxShadow: drag ? '0 0 40px -10px rgba(124,58,237,0.3), inset 0 0 40px rgba(124,58,237,0.04)' : 'none',
      }}
    >
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.08) 0%, transparent 65%)', opacity: drag ? 1 : 0 }} />
      <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(124,58,237,0.3)', borderTopColor: '#7c3aed' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Procesando archivo…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{ background: drag ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-7 h-7">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {drag ? 'Suelta aquí' : 'Arrastra tu Excel aquí'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>o haz clic para seleccionar · .xlsx .xls .csv</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Tag({ label, color = 'purple' }) {
  const s = {
    purple: { color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)' },
    green:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
    amber:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  }[color]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {label}
    </span>
  )
}

function Btn({ onClick, disabled, variant = 'primary', children, loading }) {
  const s = {
    primary:   { background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.4)' },
    secondary: { background: 'rgb(var(--color-surface-raised))', color: 'var(--text-secondary)', border: '1px solid rgb(var(--color-surface-border) / 0.7)' },
    success:   { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)' },
  }[variant]
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
      style={s}>
      {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

export default function ImportLeadsSection({ users }) {
  const [step, setStep] = useState(1)
  const [uploadData, setUploadData] = useState(null)
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedNichos, setSelectedNichos] = useState([])
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [detectedNichos, setDetectedNichos] = useState([])
  const [allLeads, setAllLeads] = useState([])

  const uploadFile = async (file) => {
    setLoading(true)
    try {
      const res = await importApi.upload(file)
      const data = res.data
      if (data.success) {
        setUploadData(data)
        setAllLeads(data.all_rows)
        const nichos = new Set()
        data.all_rows.forEach((row) => {
          const combined = [row.industry, row.sub_industry].filter(Boolean).join(' - ').trim()
          if (combined) nichos.add(combined)
        })
        setDetectedNichos(Array.from(nichos))
        toast('success', `${data.total} leads cargados`)
      }
    } catch (err) {
      toast('error', err.response?.data?.detail || 'Error al subir archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!uploadData) return
    setLoading(true)
    try {
      const res = await importApi.validate({ columns_found: uploadData.columns_found, all_rows: allLeads })
      setValidation(res.data.validation)
      setStep(2)
    } catch (err) {
      toast('error', err.response?.data?.detail || 'Error en validación')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!allLeads.length || !selectedNichos.length || !totalQuantity) {
      toast('error', 'Selecciona nichos y cantidad')
      return
    }
    const active = users.filter((u) => u.enabled)
    if (!active.length) { toast('error', 'Sin usuarios activos'); return }
    const perUser = Math.floor(totalQuantity / active.length)
    setLoading(true)
    try {
      const res = await importApi.assign({
        leads: allLeads,
        assignments: active.map((u) => ({ user_id: u.id, nichos: selectedNichos, quantity: perUser })),
      })
      if (res.data.success) {
        toast('success', `${res.data.companies_imported} empresas importadas`)
        resetForm()
      }
    } catch (err) {
      toast('error', err.response?.data?.detail || 'Error en asignación')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(1); setUploadData(null); setValidation(null)
    setSelectedNichos([]); setTotalQuantity(0); setDetectedNichos([]); setAllLeads([])
  }

  const activeUsers = users.filter((u) => u.enabled)
  const perUser = totalQuantity > 0 && activeUsers.length ? Math.floor(totalQuantity / activeUsers.length) : 0

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-px h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #7c3aed, rgba(124,58,237,0.2))' }} />
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Importar Leads</h2>
      </div>

      <div className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'rgb(var(--color-surface-card))',
          border: '1px solid rgb(var(--color-surface-border) / 0.6)',
          boxShadow: '0 4px 20px -6px rgba(0,0,0,0.12)',
        }}>
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(124,58,237,0.05) 0%, transparent 60%)' }} />

        <StepIndicator current={step} />

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <UploadZone onFile={uploadFile} loading={loading} />

            {uploadData && !loading && (
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #10b981' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{uploadData.total} leads detectados</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>Columnas mapeadas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(uploadData.columns_found).map((f) => (
                      <Tag key={f} label={`✓ ${f}`} color="green" />
                    ))}
                  </div>
                </div>
                {uploadData.sample_rows?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>Preview</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {uploadData.sample_rows.slice(0, 3).map((row, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgb(var(--color-surface-raised) / 0.5)', border: '1px solid rgb(var(--color-surface-border) / 0.4)' }}>
                          <span className="text-[10px] font-black w-4 flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{row.company_name || row.contact_name || '—'}</span>
                          {row.contact_name && <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{row.contact_name}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Btn onClick={handleValidate} loading={loading}>Validar con IA →</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && validation && (
          <div className="space-y-4">
            <div className="rounded-xl p-4"
              style={{ background: 'rgb(var(--color-surface-raised) / 0.5)', border: '1px solid rgb(var(--color-surface-border) / 0.5)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Completitud del dataset</p>
                <span className="text-lg font-black tabular-nums"
                  style={{ color: validation.completeness_pct >= 70 ? '#10b981' : validation.completeness_pct >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {validation.completeness_pct}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--color-surface-border) / 0.4)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${validation.completeness_pct}%`,
                    background: validation.completeness_pct >= 70
                      ? 'linear-gradient(90deg, #059669, #10b981)'
                      : validation.completeness_pct >= 40
                      ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                      : 'linear-gradient(90deg, #dc2626, #ef4444)',
                  }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Campos OK</p>
                <div className="flex flex-wrap gap-1">
                  {Object.values(uploadData.columns_found).map((f) => <Tag key={f} label={f} color="green" />)}
                </div>
              </div>
              {validation.missing_fields?.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Faltantes</p>
                  <div className="flex flex-wrap gap-1">
                    {validation.missing_fields.map((f) => <Tag key={f} label={f} color="amber" />)}
                  </div>
                </div>
              )}
            </div>

            {validation.recommendations && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-1">Recomendación IA</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{validation.recommendations}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Btn onClick={() => setStep(1)} variant="secondary">← Volver</Btn>
              <Btn onClick={() => setStep(3)}>Continuar →</Btn>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl p-4"
              style={{ background: 'rgb(var(--color-surface-raised) / 0.5)', border: '1px solid rgb(var(--color-surface-border) / 0.5)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{allLeads.length} leads listos</p>
                <Tag label={`${activeUsers.length} usuarios activos`} color="purple" />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Nichos</p>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{selectedNichos.length} seleccionados</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedNichos.map((n) => {
                    const sel = selectedNichos.includes(n)
                    return (
                      <button key={n}
                        onClick={() => setSelectedNichos((p) => sel ? p.filter((x) => x !== n) : [...p, n])}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200"
                        style={sel
                          ? { color: '#c4b5fd', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.5)', boxShadow: '0 0 10px rgba(124,58,237,0.2)' }
                          : { color: 'var(--text-secondary)', background: 'rgb(var(--color-surface-raised))', border: '1px solid rgb(var(--color-surface-border) / 0.6)' }}>
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>Cantidad total</p>
                <div className="relative">
                  <input type="number" min="0" max={allLeads.length} value={totalQuantity || ''} placeholder="0"
                    onChange={(e) => setTotalQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl px-4 py-2.5 font-mono text-base focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgb(var(--color-surface-raised))',
                      border: '1px solid rgba(124,58,237,0.25)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(124,58,237,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)' }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(124,58,237,0.25)'; e.target.style.boxShadow = 'none' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: 'var(--text-muted)' }}>/ {allLeads.length}</span>
                </div>
              </div>

              {perUser > 0 && (
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>÷</div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{perUser} leads por usuario</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>entre {activeUsers.length} comercial{activeUsers.length > 1 ? 'es' : ''}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Btn onClick={() => setStep(2)} variant="secondary">← Volver</Btn>
              <Btn onClick={handleAssign} loading={loading} variant="success"
                disabled={!selectedNichos.length || !totalQuantity}>
                Confirmar asignación
              </Btn>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
