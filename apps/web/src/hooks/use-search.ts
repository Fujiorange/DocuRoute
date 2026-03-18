'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from './use-debounce'

export interface SearchResult {
  id: string
  companyId: string
  projectId: string | null
  filename: string
  fileKey: string
  fileSize: number
  mimeType: string
  sha256Hash: string
  uploadedBy: string
  discipline: string | null
  issuePurpose: string | null
  status: string
  virusScanStatus: string
  virusScanCompletedAt: string | null
  watermarkStatus: string
  metadata: any
  createdAt: string
  updatedAt: string
}

export interface SearchPagination {
  page: number
  limit: number
  total: number
  pages: number
}

/**
 * useSearch hook
 *
 * Manages search state and API calls with debouncing.
 *
 * @param initialQuery - Initial search query
 * @param options - Search options (projectId, discipline, status, page, limit)
 * @returns Search state and functions
 */
export function useSearch(
  initialQuery: string = '',
  options: {
    projectId?: string
    discipline?: string
    status?: string
    page?: number
    limit?: number
  } = {}
) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [pagination, setPagination] = useState<SearchPagination | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length === 0) {
        setResults([])
        setPagination(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          ...(options.projectId && { projectId: options.projectId }),
          ...(options.discipline && { discipline: options.discipline }),
          ...(options.status && { status: options.status }),
          ...(options.page && { page: options.page.toString() }),
          ...(options.limit && { limit: options.limit.toString() }),
        })

        const response = await fetch(`/api/documents/search?${params}`)
        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        setResults(data.documents)
        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
        setPagination(null)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, options.projectId, options.discipline, options.status, options.page, options.limit])

  return {
    query,
    setQuery,
    results,
    pagination,
    isLoading,
    error,
  }
}
