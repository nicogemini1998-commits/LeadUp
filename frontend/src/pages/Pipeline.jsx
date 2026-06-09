import { useState, useEffect, useCallback } from 'react'
import { leadsApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'
import CompanyModal from '../components/CompanyModal'
import StatusBar from '../components/StatusBar'

const AVATAR_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-red-500',
]

const STATUS_COLORS = {
  pending:    'text-amber-400',
  no_answer:  'text-slate-400',
  call_later: 'text-blue-400',
  closed:     'text-emerald-400',
  rejected:     'text-red-400',
  wrong_number:  'text-orange-400',
}

const COLUMNS = [
  {
    id: 'pending',
    label: 'Pendiente',
    color: 'text-amber-400',
    border: 'border-amber-400/30',
    bg: 'bg-amber-400/5',
    dot: 'bg-amber-400',
    count_bg: 'bg-amber-400/20 text-amber-300',
  },
  {
    id: 'no_answer',
    label: 'Sin Respuesta',
    color: 'text-slate-400',
    border: 'border-slate-400/30',
    bg: 'bg-slate-400/5',
    dot: 'bg-slate-500',
    count_bg: 'bg-slate-400/20 text-slate-300',
  },
  {
    id: 'call_later',
    label: 'Llamar Luego',
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    dot: 'bg-blue-400',
    count_bg: 'bg-blue-400/20 text-blue-300',
  },
  {
    id: 'closed',
    label: 'Agendado',
    color: 'text-emerald-400',
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-400/5',
    dot: 'bg-emerald-400',
    count_bg: 'bg-emerald-400/20 text-emerald-300',
  },
  {
    id: 'rejected',
    label: 'Rechazado',
    color: 'text-red-400',
    border: 'border-red-400/30',
    bg: 'bg-red-400/5',
    dot: 'bg-red-400',
    count_bg: 'bg-red-400/20 text-red-300',
  },
  {
    id: 'wrong_number',
    label: 'Nº Erróneo',
    color: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/5',
    dot: 'bg-orange-400',
    count_bg: 'bg-orange-400/20 text-orange-300',
  },
]

function scoreColor(score) {
  if (score >= 65) return 'text-emerald-400'
  if (score >= 35) return 'text-amber-400'
  return 'text-red-400'
}

function MiniCard({ lead, onClick, onStatusChange }) {
  const { company, contact, assignment_id, status } = lead
  const mobile = contact?.phone || company.phone
  const avatarColor = AVATAR_COLORS[company.name.charCodeAt(0) % AVATAR_COLORS.length]
  const initial = company.name.charAt(0).toUpperCase()

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-gradient-to-br from-surface-raised to-surface border border-surface-border/60 rounded-xl p-4 cursor-pointer hover:border-accent/40 hover:shadow-[0_8px_16px_-2px_rgba(0,0,0,0.4)] transition-all duration-150 group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0 font-bold text-white text-sm shadow-[0_4px_8px_-1px_rgba(0,0,0,0.3)]`}>
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight group-hover:text-accent transition-colors truncate">
            {company.name}
          </p>
          {company.city && (
            <p className="text-[11px] text-slate-500 truncate">{company.city}</p>
          )}
        </div>

        <span className={`text-sm font-black flex-shrink-0 ${scoreColor(company.digital_score)}`}>
          {company.digital_score}
        </span>
      </div>

      {contact?.name && (
        <p className="text-xs text-slate-400 mb-2.5 truncate">📍 {contact.name}</p>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border/40" onClick={(e) => e.stopPropagation()}>
        {mobile ? (
          <a
            href={`tel:${mobile}`}
            className="text-[11px] font-mono text-accent hover:text-accent-light transition-colors truncate"
          >
            {mobile}
          </a>
        ) : (
          <span className="text-[11px] text-slate-600 italic">Sin teléfono</span>
        )}

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[status] || 'text-slate-400'} bg-current/10`}>
          {status === 'pending' ? '○' : status === 'no_answer' ? '✗' : status === 'call_later' ? '⏱' : status === 'closed' ? '✓' : status === 'wrong_number' ? '☎️' : '✕'}
        </span>
      </div>
    </div>
  )
}


export default function Pipeline() {
  const { user, isAdmin, logout } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leadsApi.getWeekPipeline()
      setLeads(res.data.leads)
    } catch (_) {
      // show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const handleStatusChange = (assignmentId, newStatus) => {
    setLeads((prev) =>
      prev.map((l) => l.assignment_id === assignmentId ? { ...l, status: newStatus } : l)
    )
    setSelectedLead((prev) =>
      prev?.assignment_id === assignmentId ? { ...prev, status: newStatus } : prev
    )
  }

  const handleContactChange = (assignmentId, updatedContact) => {
    setLeads((prev) =>
      prev.map((l) => l.assignment_id === assignmentId ? { ...l, contact: updatedContact } : l)
    )
    setSelectedLead((prev) =>
      prev?.assignment_id === assignmentId ? { ...prev, contact: updatedContact } : prev
    )
  }

  const byStatus = (statusId) => leads.filter((l) => l.status === statusId)
  const closedCount = leads.filter((l) => l.status === 'closed').length
  const convRate = leads.length > 0 ? Math.round((closedCount / leads.length) * 100) : 0

  return (
    <>
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-slate-400 mt-0.5">Vista Kanban — leads de hoy</p>
          </div>
          {leads.length > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-2xl font-bold text-white">{leads.length}</p>
                <p className="text-xs text-slate-500">leads</p>
              </div>
              <div className="w-px bg-surface-border" />
              <div>
                <p className="text-2xl font-bold text-emerald-400">{convRate}%</p>
                <p className="text-xs text-slate-500">conversión</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
            {COLUMNS.map((col) => {
              const colLeads = byStatus(col.id)
              return (
                <div key={col.id} className={`rounded-2xl border ${col.border} ${col.bg} p-4`}>
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.count_bg}`}>
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {colLeads.length === 0 ? (
                      <p className="text-xs text-slate-600 italic text-center py-4">Sin leads</p>
                    ) : (
                      colLeads.map((lead) => (
                        <MiniCard
                          key={lead.assignment_id}
                          lead={lead}
                          onClick={setSelectedLead}
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selectedLead && (
        <CompanyModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onContactChange={handleContactChange}
        />
      )}
    </>
  )
}
