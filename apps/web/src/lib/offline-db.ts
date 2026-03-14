import Dexie, { type Table } from 'dexie'

/**
 * Offline database using Dexie (IndexedDB wrapper).
 * Stores local mirror of document metadata for offline access.
 *
 * Guard: Dexie uses browser IndexedDB. Return null on server to prevent SSR crash.
 */

interface OfflineDocumentMeta {
  id: string
  documentCode: string
  title?: string
  discipline?: string
  issuePurpose?: string
  status: string
  revisionCode: string
  projectId: string
  companyId: string
  syncedAt: Date
}

interface OfflineAction {
  id?: number
  type: string
  payload: string
  createdAt: Date
  status: string
  retryCount: number
  lastAttemptAt: Date | null
  documentId?: string // PERFORMANCE: Added for compound index [documentId+status]
}

class DocuRouteOfflineDB extends Dexie {
  documents!: Table<OfflineDocumentMeta, string>
  actions!: Table<OfflineAction, number>

  constructor() {
    super('docuroute-offline-v1')

    // PERFORMANCE: Added compound indexes for common query patterns
    // - [companyId+projectId]: Filter documents by company and project
    // - [projectId+status]: Find all active/archived documents in a project
    // - [companyId+syncedAt]: Find documents needing sync for a company
    // - [documentId+status]: Find pending actions for a specific document
    // - [status+createdAt]: Process action queue in order
    this.version(1).stores({
      documents: 'id, documentCode, projectId, companyId, status, syncedAt, [companyId+projectId], [projectId+status], [companyId+syncedAt]',
      actions: '++id, type, status, createdAt, documentId, [documentId+status], [status+createdAt]',
    })

    this.documents = this.table('documents')
    this.actions = this.table('actions')
  }
}

// Guard: Dexie uses browser IndexedDB. Return null on server to prevent SSR crash.
export const offlineDB =
  typeof window !== 'undefined' ? new DocuRouteOfflineDB() : null

export type { OfflineDocumentMeta, OfflineAction }
