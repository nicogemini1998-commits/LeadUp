import { useState, useCallback, useEffect, useRef } from 'react'
import apiClient from '../lib/apiClient'
import { toast } from '../lib/toast'

/**
 * useReminders — Full CRUD for reminders on an assignment.
 * Supports optimistic updates with rollback on error.
 *
 * @param {number} assignmentId
 */
export function useReminders(assignmentId) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const debounceTimers = useRef({})

  // Initial fetch
  useEffect(() => {
    if (!assignmentId) return
    let cancelled = false

    const fetchReminders = async () => {
      setLoading(true)
      const result = await apiClient.get(`/assignments/${assignmentId}/reminders`)
      if (!cancelled) {
        if (result.success) {
          setReminders(result.data.reminders || [])
        }
        setLoading(false)
      }
    }

    fetchReminders()
    return () => { cancelled = true }
  }, [assignmentId])

  // Add a new reminder (optimistic)
  const add = useCallback(async (text = '', due_at = null) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      assignment_id: assignmentId,
      text,
      due_at,
      done: false,
      position: reminders.length,
      created_at: new Date().toISOString(),
    }

    setReminders(prev => [...prev, optimistic])

    const result = await apiClient.post(`/assignments/${assignmentId}/reminders`, { text, due_at })

    if (result.success) {
      setReminders(prev => prev.map(r => r.id === tempId ? result.data : r))
      toast.success('Recordatorio añadido')
    } else {
      setReminders(prev => prev.filter(r => r.id !== tempId))
      toast.error('No se pudo añadir el recordatorio')
    }
  }, [assignmentId, reminders.length])

  // Edit with debounce (500ms) — optimistic local update, background save
  const edit = useCallback((reminderId, changes) => {
    // Apply immediately
    setReminders(prev =>
      prev.map(r => r.id === reminderId ? { ...r, ...changes } : r)
    )

    // Clear existing debounce for this reminder
    if (debounceTimers.current[reminderId]) {
      clearTimeout(debounceTimers.current[reminderId])
    }

    debounceTimers.current[reminderId] = setTimeout(async () => {
      // Snapshot current state for rollback
      const snapshot = [...reminders]

      const result = await apiClient.patch(
        `/assignments/${assignmentId}/reminders/${reminderId}`,
        changes
      )

      if (!result.success) {
        setReminders(snapshot)
        toast.error('Error al guardar el recordatorio')
      }
    }, 500)
  }, [assignmentId, reminders])

  // Delete with confirmation via callback (UI handles confirm dialog)
  const deleteReminder = useCallback(async (reminderId) => {
    const snapshot = [...reminders]
    setReminders(prev => prev.filter(r => r.id !== reminderId))

    const result = await apiClient.delete(`/assignments/${assignmentId}/reminders/${reminderId}`)

    if (result.success) {
      toast.success('Recordatorio eliminado')
    } else {
      setReminders(snapshot)
      toast.error('Error al borrar el recordatorio')
    }
  }, [assignmentId, reminders])

  return { reminders, loading, add, edit, delete: deleteReminder }
}
