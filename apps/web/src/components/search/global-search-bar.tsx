'use client'

import { useState, useEffect } from 'react'
import { Search, FileText, Loader2 } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Fuse from 'fuse.js'
import { useSearch } from '@/hooks/use-search'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

/**
 * GlobalSearchBar component
 *
 * Command palette-style search with Cmd+K/Ctrl+K shortcut.
 * Features:
 * - Client-side fuzzy search using fuse.js
 * - Fallback to API search for comprehensive results
 * - Debounced queries (300ms)
 * - Keyboard shortcuts
 */
export function GlobalSearchBar() {
  const [open, setOpen] = useState(false)
  const { query, setQuery, results, isLoading } = useSearch()

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground border rounded-md hover:bg-muted/50 transition-colors w-full max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span>Search documents...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 max-w-2xl">
          <Command>
            <CommandInput
              placeholder="Search documents by filename..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && query && results.length === 0 && (
                <CommandEmpty>No documents found.</CommandEmpty>
              )}
              {!isLoading && results.length > 0 && (
                <CommandGroup heading="Documents">
                  {results.map((doc) => (
                    <Link key={doc.id} href={`/dashboard/documents/${doc.id}`} onClick={() => setOpen(false)}>
                      <CommandItem className="flex items-start gap-3 p-3 cursor-pointer">
                        <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.filename}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {doc.discipline && <span>{doc.discipline}</span>}
                            {doc.status && <span>• {doc.status}</span>}
                            <span>• {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </CommandItem>
                    </Link>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
