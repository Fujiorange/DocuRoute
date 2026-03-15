'use client'

import { Permission } from '@docuroute/types'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type PermissionCategory = {
  name: string
  permissions: Permission[]
  sensitivePermissions?: Permission[]
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Document Operations',
    permissions: [
      Permission.UPLOAD_DOCUMENT,
      Permission.VIEW_DOCUMENT,
      Permission.DOWNLOAD_DOCUMENT,
      Permission.DELETE_DOCUMENT,
      Permission.ARCHIVE_DOCUMENT,
      Permission.HARD_PURGE_DOCUMENT,
      Permission.EDIT_DOCUMENT_METADATA,
      Permission.BULK_OPERATION,
      Permission.UNDO_BULK_OPERATION,
    ],
    sensitivePermissions: [Permission.DELETE_DOCUMENT, Permission.HARD_PURGE_DOCUMENT],
  },
  {
    name: 'MDR & Naming',
    permissions: [
      Permission.IMPORT_MDR,
      Permission.VALIDATE_NAMING_MASK,
      Permission.CONFIGURE_NAMING_MASK,
    ],
  },
  {
    name: 'Workflows',
    permissions: [
      Permission.START_WORKFLOW,
      Permission.APPROVE_WORKFLOW,
      Permission.REJECT_WORKFLOW,
      Permission.FORCE_UNLOCK_WORKFLOW,
      Permission.MANAGE_WORKFLOW_TEMPLATES,
    ],
    sensitivePermissions: [Permission.FORCE_UNLOCK_WORKFLOW],
  },
  {
    name: 'Transmittals',
    permissions: [
      Permission.CREATE_TRANSMITTAL,
      Permission.SEND_TRANSMITTAL,
      Permission.VIEW_TRANSMITTAL,
    ],
  },
  {
    name: 'Team Management',
    permissions: [
      Permission.INVITE_USERS,
      Permission.MANAGE_USERS,
      Permission.DEACTIVATE_USERS,
      Permission.MANAGE_CUSTOM_ROLES,
    ],
  },
  {
    name: 'Compliance & Legal',
    permissions: [
      Permission.PLACE_LEGAL_HOLD,
      Permission.LIFT_LEGAL_HOLD,
      Permission.CONFIGURE_RETENTION,
      Permission.VIEW_AUDIT_LOG,
      Permission.EXPORT_AUDIT_VAULT,
      Permission.MANAGE_LEGAL_HOLDS,
    ],
  },
  {
    name: 'Security & Identity',
    permissions: [
      Permission.CONFIGURE_SSO,
      Permission.MANAGE_SCIM,
      Permission.CREATE_API_KEY,
      Permission.REVOKE_API_KEY,
      Permission.MANAGE_SERVICE_ACCOUNTS,
    ],
  },
  {
    name: 'Billing & Ownership',
    permissions: [
      Permission.MANAGE_BILLING,
      Permission.TRANSFER_OWNERSHIP,
      Permission.CONFIGURE_SUCCESSION,
    ],
  },
]

interface PermissionCheckboxGridProps {
  selectedPermissions: Permission[]
  onChange: (permissions: Permission[]) => void
  disabled?: boolean
}

export function PermissionCheckboxGrid({
  selectedPermissions,
  onChange,
  disabled = false,
}: PermissionCheckboxGridProps) {
  const togglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission))
    } else {
      onChange([...selectedPermissions, permission])
    }
  }

  const toggleCategoryAll = (category: PermissionCategory) => {
    const categoryPermissions = category.permissions
    const allSelected = categoryPermissions.every((p) => selectedPermissions.includes(p))

    if (allSelected) {
      onChange(selectedPermissions.filter((p) => !categoryPermissions.includes(p)))
    } else {
      const newPermissions = [...selectedPermissions]
      categoryPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p)
        }
      })
      onChange(newPermissions)
    }
  }

  const isCategoryFullySelected = (category: PermissionCategory) => {
    return category.permissions.every((p) => selectedPermissions.includes(p))
  }

  const formatPermissionLabel = (permission: Permission): string => {
    return permission
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <div className="space-y-6">
      {PERMISSION_CATEGORIES.map((category) => (
        <div key={category.name} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
            <button
              type="button"
              onClick={() => toggleCategoryAll(category)}
              disabled={disabled}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isCategoryFullySelected(category) ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {category.permissions.map((permission) => {
              const isSensitive = category.sensitivePermissions?.includes(permission)
              const isChecked = selectedPermissions.includes(permission)

              return (
                <div
                  key={permission}
                  className={`flex items-center space-x-2 p-2 rounded border transition-colors $${'{'}
                    isChecked
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  ${'}'} $${'{'}disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'${'}'}`}
                  onClick={() => !disabled && togglePermission(permission)}
                >
                  <input
                    type="checkbox"
                    id={permission}
                    checked={isChecked}
                    onChange={() => togglePermission(permission)}
                    disabled={disabled}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Label htmlFor={permission} className="flex-1 text-sm cursor-pointer select-none">
                    <div className="flex items-center gap-2">
                      <span>{formatPermissionLabel(permission)}</span>
                      {isSensitive && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                          ⚠ Sensitive
                        </Badge>
                      )}
                    </div>
                  </Label>
                </div>
              )
            })}
          </div>

          <Separator className="mt-4" />
        </div>
      ))}
    </div>
  )
}
