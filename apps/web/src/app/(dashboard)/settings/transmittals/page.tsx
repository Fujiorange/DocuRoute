'use client'

import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, Save, AlertCircle } from 'lucide-react'

interface ColumnConfig {
  enabled: boolean
  label: string
  order: number
}

interface HeaderFieldConfig {
  enabled: boolean
  label: string
}

interface TransmittalConfig {
  id: string
  numberPrefix: string
  numberPadding: number
  columns: Record<string, ColumnConfig>
  headerFields: Record<string, HeaderFieldConfig>
  footerText: string | null
  updatedAt: string
}

const COLUMN_KEYS = ['documentCode', 'title', 'revisionCode', 'status', 'discipline']
const HEADER_FIELD_KEYS = ['projectName', 'attentionTo', 'subject']

export default function TransmittalSettingsPage() {
  const [config, setConfig] = useState<TransmittalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [numberPrefix, setNumberPrefix] = useState('TR')
  const [numberPadding, setNumberPadding] = useState(3)
  const [columns, setColumns] = useState<Record<string, ColumnConfig>>({})
  const [headerFields, setHeaderFields] = useState<Record<string, HeaderFieldConfig>>({})
  const [footerText, setFooterText] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/company/transmittal-config')
      if (!res.ok) throw new Error('Failed to fetch configuration')

      const data = await res.json()
      setConfig(data.config)
      setNumberPrefix(data.config.numberPrefix)
      setNumberPadding(data.config.numberPadding)
      setColumns(data.config.columns)
      setHeaderFields(data.config.headerFields)
      setFooterText(data.config.footerText || '')
      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/company/transmittal-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberPrefix,
          numberPadding,
          columns,
          headerFields,
          footerText: footerText.trim() || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message || 'Failed to save configuration')
      }

      const data = await res.json()
      setConfig(data.config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleColumn = (key: string) => {
    setColumns((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }))
  }

  const moveColumnUp = (key: string) => {
    const currentOrder = columns[key].order
    if (currentOrder === 0) return

    const otherKey = Object.keys(columns).find((k) => columns[k].order === currentOrder - 1)
    if (!otherKey) return

    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], order: currentOrder - 1 },
      [otherKey]: { ...prev[otherKey], order: currentOrder },
    }))
  }

  const moveColumnDown = (key: string) => {
    const currentOrder = columns[key].order
    const maxOrder = Object.keys(columns).length - 1
    if (currentOrder === maxOrder) return

    const otherKey = Object.keys(columns).find((k) => columns[k].order === currentOrder + 1)
    if (!otherKey) return

    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], order: currentOrder + 1 },
      [otherKey]: { ...prev[otherKey], order: currentOrder },
    }))
  }

  const updateColumnLabel = (key: string, label: string) => {
    setColumns((prev) => ({
      ...prev,
      [key]: { ...prev[key], label },
    }))
  }

  const toggleHeaderField = (key: string) => {
    setHeaderFields((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }))
  }

  const updateHeaderFieldLabel = (key: string, label: string) => {
    setHeaderFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], label },
    }))
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Transmittal Settings</h1>
          <p className="text-gray-600 mb-8">Loading configuration...</p>
        </div>
      </div>
    )
  }

  const sortedColumns = Object.entries(columns).sort((a, b) => a[1].order - b[1].order)
  const currentYear = new Date().getFullYear()
  const exampleNumber = `${numberPrefix}-${currentYear}-${String(1).padStart(numberPadding, '0')}`

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Transmittal Settings</h1>
        <p className="text-gray-600 mb-8">
          Configure transmittal numbering format, columns, and header fields for your company.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-900 font-medium">Configuration saved successfully!</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Number Format Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Transmittal Number Format</h2>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefix
                </label>
                <input
                  type="text"
                  value={numberPrefix}
                  onChange={(e) => setNumberPrefix(e.target.value.toUpperCase())}
                  maxLength={10}
                  pattern="[A-Z0-9]+"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TR"
                />
                <p className="text-xs text-gray-500 mt-1">
                  2-10 uppercase letters/numbers (e.g., TR, SHP, BLD)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number Padding
                </label>
                <input
                  type="number"
                  value={numberPadding}
                  onChange={(e) => setNumberPadding(parseInt(e.target.value) || 3)}
                  min={1}
                  max={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of digits (1-6): 3 = 001, 4 = 0001
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">Preview:</p>
              <p className="text-lg font-mono font-bold text-blue-700">{exampleNumber}</p>
            </div>
          </div>

          {/* Document Columns Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Document Table Columns</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which columns to display and customize their labels. Use arrows to reorder.
            </p>

            <div className="space-y-3">
              {sortedColumns.map(([key, col]) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 p-3 border rounded-lg ${
                    col.enabled ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(key)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex-1">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => updateColumnLabel(key, e.target.value)}
                      disabled={!col.enabled}
                      className={`w-full px-3 py-1 border rounded ${
                        col.enabled
                          ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Field: {key}</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => moveColumnUp(key)}
                      disabled={col.order === 0 || !col.enabled}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUp className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => moveColumnDown(key)}
                      disabled={col.order === sortedColumns.length - 1 || !col.enabled}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDown className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Header Fields Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Header Fields</h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure which fields appear in the transmittal header.
            </p>

            <div className="space-y-3">
              {Object.entries(headerFields).map(([key, field]) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 p-3 border rounded-lg ${
                    field.enabled ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleHeaderField(key)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex-1">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateHeaderFieldLabel(key, e.target.value)}
                      disabled={!field.enabled}
                      className={`w-full px-3 py-1 border rounded ${
                        field.enabled
                          ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
                          : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Field: {key}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Text Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Footer Text</h2>
            <p className="text-sm text-gray-600 mb-4">
              Optional custom text displayed at the bottom of transmittals (max 500 characters).
            </p>

            <textarea
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter footer text (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {footerText.length} / 500 characters
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
