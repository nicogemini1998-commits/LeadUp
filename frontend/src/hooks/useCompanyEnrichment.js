import { useState, useCallback } from 'react'
import apiClient from '../lib/apiClient'

const CACHE_FRESH_MS = 60 * 60 * 1000 // 1 hour

function isCacheFresh(enrichment) {
  if (!enrichment?.generated_at) return false
  return Date.now() - new Date(enrichment.generated_at).getTime() < CACHE_FRESH_MS
}

/**
 * useCompanyEnrichment — Fetch and generate AI enrichment for an assignment.
 *
 * Uses the existing /leads/:assignmentId/generate-report endpoint.
 * "enrichment" here maps to the report data already stored in the DB.
 *
 * @param {number} assignmentId
 * @param {object|null} initialEnrichment  — pre-loaded enrichment if available
 */
export function useCompanyEnrichment(assignmentId, initialEnrichment = null) {
  const [enrichment, setEnrichment] = useState(initialEnrichment)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(isCacheFresh(initialEnrichment))

  const enrich = useCallback(async ({ force = false } = {}) => {
    if (loading) return
    setLoading(true)
    setError(null)

    if (force) {
      await apiClient.delete(`/leads/${assignmentId}/report-cache`)
    }

    const result = await apiClient.post(`/leads/${assignmentId}/generate-report`)

    if (result.success) {
      const data = result.data
      setEnrichment({
        report: data.report,
        opportunity_level: data.opportunity_level,
        opportunity_reason: data.opportunity_reason,
        hooks: data.hooks || [],
        opening_lines: data.opening_lines || [],
        call_to_action: data.call_to_action,
        generated_at: data.generated_at || new Date().toISOString(),
      })
      setCached(Boolean(data.cached))
    } else {
      setError(result.error || 'Error al generar inteligencia')
    }

    setLoading(false)
  }, [assignmentId, loading])

  return { enrichment, loading, error, cached, enrich }
}
