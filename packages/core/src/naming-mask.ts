/**
 * Equipment Tag Naming Mask Validation
 *
 * Validates and generates equipment tags based on company or project-specific formats.
 * Supports project-level overrides to handle different naming conventions
 * (e.g., vessel projects vs FPSO projects).
 */

import { getPrismaForCompany } from '@docuroute/db'

export interface TagFormatRule {
  field: string
  pattern: string // Regex pattern (e.g., "^[A-Z]{2}$")
  minLength?: number
  maxLength?: number
  allowedValues?: string[]
  description?: string
}

export interface NamingMaskConfig {
  pattern: string // e.g., "{discipline}-{area}-{type}-{sequence:4d}"
  rules: Record<string, TagFormatRule>
}

export interface TagComponents {
  discipline?: string
  area?: string
  type?: string
  sequence?: number
  [key: string]: string | number | undefined
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
  parsed?: TagComponents
}

/**
 * Get the tag format for a project or company
 *
 * Priority:
 * 1. Project-specific format (if projectId provided and project has tagFormatId)
 * 2. Explicitly specified format (if formatId provided)
 * 3. Company default format (isDefault = true)
 * 4. First format in company (fallback)
 */
export async function getTagFormat(
  companyId: string,
  projectId?: string,
  formatId?: string
): Promise<NamingMaskConfig | null> {
  const prisma = getPrismaForCompany(companyId) as any

  try {
    // Option 1: Specific format requested
    if (formatId) {
      const format = await prisma.equipmentTagFormat.findFirst({
        where: {
          id: formatId,
          companyId,
        },
      })
      if (format) {
        return {
          pattern: format.pattern,
          rules: format.rules || {},
        }
      }
    }

    // Option 2: Project-specific format
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
        include: {
          tagFormat: true,
        },
      })

      if (project?.tagFormat) {
        return {
          pattern: project.tagFormat.pattern,
          rules: project.tagFormat.rules || {},
        }
      }
    }

    // Option 3: Company default format
    const defaultFormat = await prisma.equipmentTagFormat.findFirst({
      where: {
        companyId,
        isDefault: true,
      },
    })

    if (defaultFormat) {
      return {
        pattern: defaultFormat.pattern,
        rules: defaultFormat.rules || {},
      }
    }

    // Option 4: First format available (fallback)
    const anyFormat = await prisma.equipmentTagFormat.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    })

    if (anyFormat) {
      return {
        pattern: anyFormat.pattern,
        rules: anyFormat.rules || {},
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching tag format:', error)
    return null
  }
}

/**
 * Validate an equipment tag against format rules
 */
export async function validateEquipmentTag(
  companyId: string,
  tag: string,
  projectId?: string,
  formatId?: string
): Promise<ValidationResult> {
  const format = await getTagFormat(companyId, projectId, formatId)

  if (!format) {
    return {
      valid: false,
      errors: ['No tag format configured for this company/project'],
    }
  }

  const errors: string[] = []
  const parsed: TagComponents = {}

  // Parse tag based on pattern
  // Pattern example: "{discipline}-{area}-{type}-{sequence:4d}"
  const patternRegex = /\{([^}:]+)(?::([^}]+))?\}/g
  const patternParts: Array<{ name: string; format?: string }> = []
  let match: RegExpExecArray | null

  while ((match = patternRegex.exec(format.pattern)) !== null) {
    patternParts.push({
      name: match[1],
      format: match[2],
    })
  }

  // Build regex from pattern
  let regexPattern = format.pattern
  for (const part of patternParts) {
    const rule = format.rules[part.name]
    if (rule?.pattern) {
      // Use custom pattern from rules
      regexPattern = regexPattern.replace(`{${part.name}}`, `(${rule.pattern})`)
    } else if (part.format?.endsWith('d')) {
      // Numeric format (e.g., "4d" = 4 digits)
      const digits = parseInt(part.format.slice(0, -1), 10)
      regexPattern = regexPattern.replace(`{${part.name}:${part.format}}`, `(\\d{${digits}})`)
    } else {
      // Default: any non-separator characters
      regexPattern = regexPattern.replace(`{${part.name}}`, `([^-]+)`)
    }
  }

  const tagRegex = new RegExp(`^${regexPattern}$`)
  const tagMatch = tag.match(tagRegex)

  if (!tagMatch) {
    errors.push(`Tag does not match pattern: ${format.pattern}`)
    return { valid: false, errors }
  }

  // Extract components
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i]
    const value = tagMatch[i + 1]
    parsed[part.name] = part.format?.endsWith('d') ? parseInt(value, 10) : value

    // Validate against rules
    const rule = format.rules[part.name]
    if (rule) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${part.name} must be at least ${rule.minLength} characters`)
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${part.name} must be at most ${rule.maxLength} characters`)
      }
      if (rule.allowedValues && !rule.allowedValues.includes(value)) {
        errors.push(`${part.name} must be one of: ${rule.allowedValues.join(', ')}`)
      }
      if (rule.pattern) {
        const ruleRegex = new RegExp(rule.pattern)
        if (!ruleRegex.test(value)) {
          errors.push(`${part.name} must match pattern: ${rule.pattern}`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    parsed: errors.length === 0 ? parsed : undefined,
  }
}

/**
 * Generate next sequence number for a project
 * (Placeholder - full implementation would track per-project counters)
 */
export async function getNextSequenceNumber(
  companyId: string,
  projectId: string
): Promise<number> {
  // TODO: Implement sequence counter tracking per project
  // For now, return a placeholder
  return 1
}

/**
 * Generate a new equipment tag based on components and format
 */
export async function generateEquipmentTag(
  companyId: string,
  components: TagComponents,
  projectId?: string,
  formatId?: string
): Promise<string | null> {
  const format = await getTagFormat(companyId, projectId, formatId)

  if (!format) {
    return null
  }

  let tag = format.pattern

  // Replace each placeholder with component value
  for (const [key, value] of Object.entries(components)) {
    const placeholder = new RegExp(`\\{${key}(?::[^}]+)?\\}`, 'g')
    const stringValue = typeof value === 'number' ? value.toString().padStart(4, '0') : String(value)
    tag = tag.replace(placeholder, stringValue)
  }

  return tag
}
