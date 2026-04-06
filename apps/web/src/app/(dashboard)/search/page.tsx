'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, FileText, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  filename: string
  documentCode: string | null
  title: string | null
  discipline: string | null
  status: string
  hasSearchableContent: boolean
  rank: number
  snippet?: string
  createdAt: string
}

interface SearchResponse {
  documents: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  searchType: 'metadata' | 'fulltext' | 'both'
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [searchType, setSearchType] = useState<'metadata' | 'fulltext' | 'both'>(
    (searchParams?.get('type') as any) || 'metadata'
  )
  const [results, setResults] = useState<SearchResult[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(false)

  const performSearch = async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        page: page.toString(),
        limit: '20',
      })

      const res = await fetch(`/api/documents/search?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await res.json()
      setResults(data.documents)
      setPagination(data.pagination)
    } catch (error) {
      toast({
        title: 'Search Error',
        description: 'Failed to search documents. Please try again.',
        variant: 'destructive',
      })
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [searchParams, searchType])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=${searchType}`)
      performSearch(query)
    }
  }

  const handleSearchTypeChange = (type: 'metadata' | 'fulltext' | 'both') => {
    setSearchType(type)
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}&type=${type}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const highlightSnippet = (snippet: string) => {
    // The snippet from ts_headline already contains <b> tags for highlights
    return <span dangerouslySetInnerHTML={{ __html: snippet }} />
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search Documents</h1>
        <p className="text-muted-foreground mt-1">
          Search by document code, title, or inside PDF content
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {/* Search Type Toggle */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Search in:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={searchType === 'metadata' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearchTypeChange('metadata')}
                >
                  Metadata Only
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'fulltext' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearchTypeChange('fulltext')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF Content
                </Button>
                <Button
                  type="button"
                  variant={searchType === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearchTypeChange('both')}
                >
                  Both
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {query && (
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? (
                'Searching...'
              ) : (
                <>
                  Found {pagination.total} result{pagination.total !== 1 ? 's' : ''}
                  {searchType === 'fulltext' && ' in PDF content'}
                  {searchType === 'both' && ' in metadata and PDF content'}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Searching documents...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No documents found for "{query}"
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/documents/${result.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            {result.documentCode || result.filename}
                          </h3>
                          {result.hasSearchableContent && (
                            <Badge variant="secondary" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              Searchable
                            </Badge>
                          )}
                        </div>
                        {result.title && (
                          <p className="text-sm text-muted-foreground mb-2">{result.title}</p>
                        )}
                        {result.snippet && (
                          <div className="text-sm bg-muted/30 p-2 rounded border-l-2 border-primary">
                            {highlightSnippet(result.snippet)}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <Badge variant="outline">{result.status}</Badge>
                        {result.discipline && (
                          <p className="text-xs text-muted-foreground mt-1">{result.discipline}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(result.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => performSearch(query, pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => performSearch(query, pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      {!query && (
        <Card>
          <CardHeader>
            <CardTitle>Search Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Metadata Only:</strong> Search in document codes, titles, and filenames
              (fastest)
            </p>
            <p>
              <strong>PDF Content:</strong> Search inside extracted PDF text for specific terms
            </p>
            <p>
              <strong>Both:</strong> Search in both metadata and PDF content (comprehensive)
            </p>
            <p className="mt-4 pt-4 border-t">
              Only PDF documents with{' '}
              <Badge variant="secondary" className="mx-1">
                Searchable
              </Badge>{' '}
              badge have indexed content available for full-text search.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
