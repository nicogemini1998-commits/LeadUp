import { useState, useEffect, useCallback } from 'react'
import { leadsApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'
import CompanyCard from '../components/CompanyCard'
import CompanyModal from '../components/CompanyModal'

const STATUS_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'no_answer', label: 'Sin respuesta' },
  { id: 'call_later', label: 'Llamar luego' },
  { id: 'closed', label: 'Cerrado' },
  { id: 'rejected', label: 'Rechazado' },
]


export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedLead, setSelectedLead] = useState(null)
  const [date, setDate] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await leadsApi.getWeekPipeline()
      setLeads(res.data.leads)
    } catch (err) {
      setError('Error al cargar los leads. Comprueba la conexión con el servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleStatusChange = (assignmentId, newStatus) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.assignment_id === assignmentId ? { ...l, status: newStatus } : l
      )
    )
    setSelectedLead((prev) =>
      prev?.assignment_id === assignmentId ? { ...prev, status: newStatus } : prev
    )
  }

  const handleContactChange = (assignmentId, updatedContact) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.assignment_id === assignmentId ? { ...l, contact: updatedContact } : l
      )
    )
    setSelectedLead((prev) =>
      prev?.assignment_id === assignmentId ? { ...prev, contact: updatedContact } : prev
    )
  }

  const handlePhoneRevealed = (assignmentId, phone) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.assignment_id === assignmentId
          ? { ...l, contact: l.contact ? { ...l.contact, phone, phone_revealed: true } : l.contact }
          : l
      )
    )
    setSelectedLead((prev) =>
      prev?.assignment_id === assignmentId && prev.contact
        ? { ...prev, contact: { ...prev.contact, phone, phone_revealed: true } }
        : prev
    )
  }

  const filteredLeads = activeTab === 'all'
    ? leads
    : leads.filter((l) => l.status === activeTab)

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.id] = tab.id === 'all' ? leads.length : leads.filter((l) => l.status === tab.id).length
    return acc
  }, {})

  const closedCount = leads.filter((l) => l.status === 'closed').length
  const conversionRate = leads.length > 0 ? Math.round((closedCount / leads.length) * 100) : 0

  return (
    <>
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Mis leads</h1>
            <p className="text-sm text-slate-400 mt-0.5">Semana actual — todos tus leads asignados</p>
          </div>

          {/* Quick stats */}
          {leads.length > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-2xl font-bold text-white">{leads.length}</p>
                <p className="text-xs text-slate-500">leads</p>
              </div>
              <div className="w-px bg-surface-border" />
              <div>
                <p className="text-2xl font-bold text-emerald-400">{conversionRate}%</p>
                <p className="text-xs text-slate-500">cerrados</p>
              </div>
            </div>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150
                ${activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'}`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full
                ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-card text-slate-500'}`}
              >
                {statusCounts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Cargando leads...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="card p-6 border-red-500/20 text-center">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={fetchLeads} className="btn-primary text-sm">Reintentar</button>
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && (
          <div className="text-center py-16">
            {leads.length === 0 ? (
              <>
                <p className="text-slate-400 text-lg mb-2">No hay leads asignados hoy</p>
                <p className="text-slate-600 text-sm">Los leads se asignan automáticamente a las 8:00 AM</p>
              </>
            ) : (
              <p className="text-slate-400">No hay leads con estado "{activeTab}"</p>
            )}
          </div>
        )}

        {!loading && !error && filteredLeads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLeads.map((lead) => (
              <CompanyCard
                key={lead.assignment_id}
                lead={lead}
                onClick={setSelectedLead}
                onStatusChange={handleStatusChange}
                onPhoneRevealed={handlePhoneRevealed}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
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
