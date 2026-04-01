/**
 * Transmittal Utility Functions
 * Helper functions for working with dynamic transmittal configuration
 */

export interface ColumnConfig {
  enabled: boolean
  label: string
  order: number
}

export interface HeaderFieldConfig {
  enabled: boolean
  label: string
}

export interface TransmittalConfig {
  numberPrefix: string
  numberPadding: number
  columns: Record<string, ColumnConfig>
  headerFields: Record<string, HeaderFieldConfig>
  footerText: string | null
}

export interface TransmittalDocument {
  documentCode?: string
  title?: string
  revisionCode: string
  status?: string
  discipline?: string
  [key: string]: any
}

/**
 * Get enabled columns sorted by order
 */
export function getEnabledColumns(config: TransmittalConfig): Array<{
  key: string
  label: string
  order: number
}> {
  return Object.entries(config.columns)
    .filter(([_, col]) => col.enabled)
    .map(([key, col]) => ({
      key,
      label: col.label,
      order: col.order,
    }))
    .sort((a, b) => a.order - b.order)
}

/**
 * Get enabled header fields
 */
export function getEnabledHeaderFields(
  config: TransmittalConfig
): Array<{
  key: string
  label: string
}> {
  return Object.entries(config.headerFields)
    .filter(([_, field]) => field.enabled)
    .map(([key, field]) => ({
      key,
      label: field.label,
    }))
}

/**
 * Get column value from document
 */
export function getColumnValue(
  document: TransmittalDocument,
  columnKey: string
): string {
  switch (columnKey) {
    case 'documentCode':
      return document.documentCode || '-'
    case 'title':
      return document.title || '-'
    case 'revisionCode':
      return document.revisionCode || '-'
    case 'status':
      return document.status || '-'
    case 'discipline':
      return document.discipline || '-'
    default:
      return document[columnKey]?.toString() || '-'
  }
}

/**
 * Format transmittal number using config
 */
export function formatTransmittalNumber(
  prefix: string,
  year: number,
  sequence: number,
  padding: number
): string {
  return `${prefix}-${year}-${String(sequence).padStart(padding, '0')}`
}

/**
 * Default column configuration
 */
export const DEFAULT_COLUMN_CONFIG: Record<string, ColumnConfig> = {
  documentCode: { enabled: true, label: 'Document Code', order: 0 },
  title: { enabled: true, label: 'Title', order: 1 },
  revisionCode: { enabled: true, label: 'Revision', order: 2 },
  status: { enabled: false, label: 'Status', order: 3 },
  discipline: { enabled: false, label: 'Discipline', order: 4 },
}

/**
 * Default header field configuration
 */
export const DEFAULT_HEADER_FIELD_CONFIG: Record<string, HeaderFieldConfig> = {
  projectName: { enabled: false, label: 'Project Name' },
  attentionTo: { enabled: false, label: 'Attention To' },
  subject: { enabled: true, label: 'Subject' },
}
