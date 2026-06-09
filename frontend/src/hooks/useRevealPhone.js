import { useState, useCallback } from 'react'
import apiClient from '../lib/apiClient'

/**
 * useRevealPhone — Manages Lusha phone reveal for a contact.
 *
 * The hook is keyed by assignmentId (the FK that the backend route uses).
 * Pass `initialPhone` + `initialRevealed` from the contact object so the
 * hook boots in the correct state without needing a fetch.
 *
 * @param {number} assignmentId
 * @param {{ phone?: string, phone_revealed?: boolean, revealed_at?: string }} initial
 */
export function useRevealPhone(assignmentId, initial = {}) {
  const [phone, setPhone] = useState(initial.phone_revealed ? initial.phone : null)
  const [email, setEmail] = useState(initial.email || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revealedAt, setRevealedAt] = useState(
    initial.phone_revealed ? (initial.revealed_at || new Date().toISOString()) : null
  )

  const revealed = Boolean(phone)

  const reveal = useCallback(async () => {
    if (loading || revealed) return
    setLoading(true)
    setError(null)

    const result = await apiClient.post(`/leads/${assignmentId}/reveal-phone`)

    if (result.success) {
      setPhone(result.data.phone || null)
      setEmail(result.data.email || null)
      setRevealedAt(result.data.revealed_at || new Date().toISOString())
    } else {
      setError(result.error || 'Lusha no encontró este contacto')
    }

    setLoading(false)
  }, [assignmentId, loading, revealed])

  return { phone, email, loading, error, revealed_at: revealedAt, revealed, reveal }
}
