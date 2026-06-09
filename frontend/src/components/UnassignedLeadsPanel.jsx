import { useState, useEffect } from 'react'
import { adminApi } from '../lib/api'
import { toast } from '../lib/toast'

export default function UnassignedLeadsPanel({ users }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedAssignments, setSelectedAssignments] = useState({})
  const [assigningUserId, setAssigningUserId] = useState(null)
  const [assignCount, setAssignCount] = useState(0)

  useEffect(() => {
    fetchUnassigned()
  }, [])

  const fetchUnassigned = async () => {
    try {
      const response = await adminApi.getUnassignedLeads()
      setData(response.data)
    } catch (error) {
      console.error(error)
      toast('error', 'Error al cargar leads sin asignar')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLead = (companyId, checked) => {
    setSelectedAssignments(prev => {
      const updated = { ...prev }
      if (checked) {
        updated[companyId] = assigningUserId || null
      } else {
        delete updated[companyId]
      }
      return updated
    })
  }

  const handleBulkAssign = async () => {
    if (!assigningUserId) {
      toast('error', 'Selecciona un usuario')
      return
    }

    const assignments = Object.entries(selectedAssignments)
      .filter(([, uid]) => uid === assigningUserId)
      .map(([companyId]) => ({
        company_id: parseInt(companyId),
        user_id: assigningUserId,
      }))

    if (!assignments.length) {
      toast('error', 'Selecciona al menos un lead')
      return
    }

    try {
      const result = await adminApi.assignBulk(assignments)
      toast('success', `✓ ${result.data.assigned} leads asignados`)
      setSelectedAssignments({})
      setAssigningUserId(null)
      fetchUnassigned()
    } catch (error) {
      console.error(error)
      toast('error', error.response?.data?.detail || 'Error en asignación')
    }
  }

  if (loading || !data || data.total_unassigned === 0) return null

  return (
    <div className="card p-5 bg-gradient-to-br from-surface-card to-surface border-surface-border/60 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4">📋 Leads Sin Asignar</h3>

      {/* Summary por nicho */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(data.summary).map(([niche, count]) => (
          <div key={niche} className="bg-surface-raised border border-surface-border rounded-lg p-3">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{niche}</p>
            <p className="text-2xl font-black text-accent mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Lista de leads por nicho */}
      <div className="space-y-5 max-h-96 overflow-y-auto mb-5">
        {Object.entries(data.by_niche).map(([niche, leads]) => (
          <div key={niche} className="border-l-4 border-accent/40 pl-4">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">{niche}</p>
            <div className="space-y-2">
              {leads.map(lead => (
                <label key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-raised/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAssignments[lead.id] === assigningUserId}
                    onChange={(e) => handleToggleLead(lead.id, e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.city}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Controls de asignación */}
      <div className="flex gap-3 items-center">
        <select
          value={assigningUserId || ''}
          onChange={(e) => setAssigningUserId(e.target.value ? parseInt(e.target.value) : null)}
          className="flex-1 px-3 py-2 bg-surface-raised border border-surface-border text-white rounded-lg text-sm"
        >
          <option value="">Seleccionar usuario...</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleBulkAssign}
          disabled={!assigningUserId || !Object.keys(selectedAssignments).length}
          className="px-4 py-2 bg-accent text-white font-bold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/80 transition"
        >
          Asignar ({Object.keys(selectedAssignments).length})
        </button>
      </div>
    </div>
  )
}
