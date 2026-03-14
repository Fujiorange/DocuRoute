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
}

class DocuRouteOfflineDB extends Dexie {
  documents!: Table<OfflineDocumentMeta, string>
  actions!: Table<OfflineAction, number>

  constructor() {
    super('docuroute-offline-v1')

    this.version(1).stores({
      documents: 'id, documentCode, projectId, companyId, status, syncedAt',
      actions: '++id, type, status, createdAt',
    })

    this.documents = this.table('documents')
    this.actions = this.table('actions')
  }
}

// Guard: Dexie uses browser IndexedDB. Return null on server to prevent SSR crash.
export const offlineDB =
  typeof window !== 'undefined' ? new DocuRouteOfflineDB() : null

export type { OfflineDocumentMeta, OfflineAction }
