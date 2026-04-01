'use client'

import { TransmittalConfig, TransmittalDocument, getEnabledColumns, getColumnValue } from '@/lib/transmittal/config'

interface TransmittalDocumentTableProps {
  documents: TransmittalDocument[]
  config: TransmittalConfig
  className?: string
}

/**
 * Dynamic Transmittal Document Table
 * Renders a table with columns based on company configuration
 */
export function TransmittalDocumentTable({
  documents,
  config,
  className = '',
}: TransmittalDocumentTableProps) {
  const enabledColumns = getEnabledColumns(config)

  if (documents.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        No documents in this transmittal
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            {enabledColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {documents.map((document, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {enabledColumns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-nowrap px-3 py-4 text-sm text-gray-900"
                >
                  {getColumnValue(document, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
