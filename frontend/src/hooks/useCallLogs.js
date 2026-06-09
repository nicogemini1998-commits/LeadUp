import { useState, useEffect, useCallback } from 'react'
import { leadsApi } from '../lib/api'

export function useCallLogs(assignmentId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    if (!assignmentId) return
    setLoading(true)
    try {
      const res = await leadsApi.getCallLogs(assignmentId)
      setLogs(res.data.logs || [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addLog = useCallback((log) => {
    setLogs(prev => [log, ...prev])
  }, [])

  return { logs, loading, refetch: fetchLogs, addLog }
}
