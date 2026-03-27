# Project-Level Equipment Tag Format Override

## Overview

DocuRoute supports flexible equipment tag naming conventions that can be configured at both the company and project levels. This allows different projects (e.g., vessels vs FPSOs) to use different tag formats while maintaining consistency within each project.

## Architecture

### Priority System

Tag format resolution follows this priority order:

1. **Project-specific format** - If a project has `tagFormatId` set, use that format
2. **Explicit format** - If a formatId is explicitly passed to validation/generation functions
3. **Company default** - The format marked as `isDefault: true` for the company
4. **First available** - Any format belonging to the company

This ensures maximum flexibility while maintaining sensible defaults.

### Database Schema

```prisma
model EquipmentTagFormat {
  id          String    @id @default(cuid())
  companyId   String
  name        String
  pattern     String    // e.g., "{discipline}-{area}-{type}-{sequence:4d}"
  description String?
  rules       Json?     // Additional validation rules (optional)
  isDefault   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  company     Company   @relation(fields: [companyId], references: [id])
  projects    Project[]

  @@unique([companyId, name])
  @@index([companyId, isDefault])
}

model Project {
  id             String              @id @default(cuid())
  companyId      String
  tagFormatId    String?

  company        Company             @relation(fields: [companyId], references: [id])
  tagFormat      EquipmentTagFormat? @relation(fields: [tagFormatId], references: [id])
}
```

## Tag Pattern Syntax

### Pattern Components

Tag patterns use placeholder syntax: `{component}` or `{component:format}`

**Standard Components:**
- `{discipline}` - Engineering discipline (e.g., "E" for electrical, "M" for mechanical)
- `{area}` - Equipment location/area (e.g., "ER" for engine room)
- `{type}` - Equipment type code (e.g., "PMP" for pump)
- `{sequence}` - Sequential number
- `{system}` - System identifier (optional)
- `{level}` - Deck level (optional)

**Format Modifiers:**
- `{sequence:4d}` - 4-digit zero-padded number (e.g., "0001")
- `{sequence:3d}` - 3-digit zero-padded number (e.g., "001")
- `{component:upper}` - Force uppercase (default behavior)

### Example Patterns

**Vessel Format:**
```
Pattern: "{discipline}-{area}-{type}-{sequence:4d}"
Example: "E-ER-PMP-0001"
```

**FPSO Format:**
```
Pattern: "{system}-{discipline}{area}-{type}-{sequence:3d}"
Example: "SYS-EA1-PMP-001"
```

**Simple Sequential:**
```
Pattern: "{discipline}{type}{sequence:5d}"
Example: "EPMP00001"
```

## Configuration

### Creating a Tag Format

```typescript
import { getPrismaForCompany } from '@docuroute/db'

const prisma = getPrismaForCompany(companyId)

const format = await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'Vessel Standard',
    pattern: '{discipline}-{area}-{type}-{sequence:4d}',
    description: 'Standard vessel equipment tagging format',
    isDefault: true, // Mark as company default
    rules: {
      discipline: {
        allowed: ['E', 'M', 'H', 'I', 'S'],
        description: 'E=Electrical, M=Mechanical, H=HVAC, I=Instrumentation, S=Structural'
      },
      area: {
        allowed: ['ER', 'BR', 'WH', 'DK', 'ACC'],
        description: 'ER=Engine Room, BR=Bridge, WH=Wheelhouse, DK=Deck, ACC=Accommodation'
      }
    }
  }
})
```

### Assigning Format to Project

```typescript
// Method 1: During project creation
const project = await prisma.project.create({
  data: {
    companyId,
    name: 'FPSO Project Alpha',
    tagFormatId: fpsoFormatId, // Use FPSO-specific format
  }
})

// Method 2: Update existing project
await prisma.project.update({
  where: { id: projectId },
  data: { tagFormatId: newFormatId }
})
```

### Creating Multiple Formats

```typescript
// Create company default (vessel format)
const vesselFormat = await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'Vessel Standard',
    pattern: '{discipline}-{area}-{type}-{sequence:4d}',
    isDefault: true
  }
})

// Create FPSO-specific format
const fpsoFormat = await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'FPSO Standard',
    pattern: '{system}-{discipline}{area}-{type}-{sequence:3d}',
    isDefault: false
  }
})

// Projects without tagFormatId will use vesselFormat (default)
// FPSO projects can explicitly set tagFormatId to fpsoFormat
```

## Usage

### Validating Equipment Tags

```typescript
import { validateEquipmentTag } from '@docuroute/core/src/naming-mask'

// Validate tag for a specific project (uses project's format)
const result = await validateEquipmentTag(
  companyId,
  'E-ER-PMP-0001',
  projectId
)

if (result.isValid) {
  console.log('Tag is valid')
  console.log('Components:', result.components)
} else {
  console.error('Validation errors:', result.errors)
}

// Validate tag using explicit format
const result2 = await validateEquipmentTag(
  companyId,
  'E-ER-PMP-0001',
  undefined, // no project
  formatId   // explicit format ID
)
```

### Generating Equipment Tags

```typescript
import { generateEquipmentTag } from '@docuroute/core/src/naming-mask'

// Generate tag for project (uses project's format)
const tag = await generateEquipmentTag(
  companyId,
  {
    discipline: 'E',
    area: 'ER',
    type: 'PMP',
    sequence: 1
  },
  projectId
)

console.log(tag) // "E-ER-PMP-0001"

// Generate tag using explicit format
const tag2 = await generateEquipmentTag(
  companyId,
  {
    system: 'SYS',
    discipline: 'E',
    area: 'A1',
    type: 'PMP',
    sequence: 1
  },
  undefined, // no project
  fpsoFormatId
)

console.log(tag2) // "SYS-EA1-PMP-001"
```

### Getting Tag Format

```typescript
import { getTagFormat } from '@docuroute/core/src/naming-mask'

// Get format for project (returns project's format or company default)
const format = await getTagFormat(companyId, projectId)

console.log(format.pattern) // "{discipline}-{area}-{type}-{sequence:4d}"
console.log(format.name)    // "Vessel Standard"

// Get explicit format
const format2 = await getTagFormat(companyId, undefined, formatId)
```

## BIM Integration

When importing equipment from BIM CSV files, tags are automatically validated against the project's assigned format:

```typescript
// In bim-import.ts
import { validateEquipmentTag } from '@docuroute/core/src/naming-mask'

for (const row of csvRows) {
  const validation = await validateEquipmentTag(
    companyId,
    row.tag,
    projectId // Uses project's tag format
  )

  if (!validation.isValid) {
    conflicts.push({
      row: rowNumber,
      tag: row.tag,
      issue: `Tag format violation: ${validation.errors.join(', ')}`,
      severity: 'error'
    })
  }
}
```

## Migration Guide

### Migrating Existing Projects

When deploying this feature, existing projects will use the company's default format unless explicitly assigned a different format.

**Migration Steps:**

1. **Create default format** for existing company tagging convention:
```typescript
const defaultFormat = await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'Company Default',
    pattern: '{discipline}-{area}-{type}-{sequence:4d}',
    isDefault: true
  }
})
```

2. **Create project-specific formats** for projects with different conventions:
```typescript
const fpsoFormat = await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'FPSO Format',
    pattern: '{system}-{discipline}{area}-{type}-{sequence:3d}',
    isDefault: false
  }
})
```

3. **Assign formats to projects** that need overrides:
```typescript
await prisma.project.updateMany({
  where: {
    companyId,
    name: { contains: 'FPSO' } // or other identifying criteria
  },
  data: {
    tagFormatId: fpsoFormat.id
  }
})
```

4. **Validate existing equipment tags** against new formats:
```typescript
const equipment = await prisma.equipment.findMany({ where: { projectId } })

for (const item of equipment) {
  const validation = await validateEquipmentTag(companyId, item.tag, projectId)
  if (!validation.isValid) {
    console.warn(`Invalid tag: ${item.tag}`, validation.errors)
  }
}
```

## API Endpoints (Phase 2)

**Note:** API endpoints are planned for Phase 2. The following endpoints will be implemented:

- `GET /api/companies/:companyId/tag-formats` - List all formats
- `POST /api/companies/:companyId/tag-formats` - Create new format
- `GET /api/companies/:companyId/tag-formats/:id` - Get format details
- `PATCH /api/companies/:companyId/tag-formats/:id` - Update format
- `DELETE /api/companies/:companyId/tag-formats/:id` - Delete format
- `POST /api/companies/:companyId/tag-formats/:id/set-default` - Set as default
- `POST /api/projects/:projectId/tag-format` - Assign format to project
- `POST /api/projects/:projectId/validate-tag` - Validate tag for project

## Testing

### Unit Tests

```typescript
import { validateEquipmentTag, generateEquipmentTag } from '@docuroute/core/src/naming-mask'

describe('Tag Format Validation', () => {
  it('validates vessel format tags', async () => {
    const result = await validateEquipmentTag(
      companyId,
      'E-ER-PMP-0001',
      vesselProjectId
    )
    expect(result.isValid).toBe(true)
    expect(result.components).toEqual({
      discipline: 'E',
      area: 'ER',
      type: 'PMP',
      sequence: '0001'
    })
  })

  it('validates FPSO format tags', async () => {
    const result = await validateEquipmentTag(
      companyId,
      'SYS-EA1-PMP-001',
      fpsoProjectId
    )
    expect(result.isValid).toBe(true)
  })

  it('rejects invalid format', async () => {
    const result = await validateEquipmentTag(
      companyId,
      'INVALID',
      projectId
    )
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

## Troubleshooting

### No default format found

**Error:** `No tag format found for company ${companyId}`

**Solution:** Create a default format:
```typescript
await prisma.equipmentTagFormat.create({
  data: {
    companyId,
    name: 'Default',
    pattern: '{discipline}-{type}-{sequence:4d}',
    isDefault: true
  }
})
```

### Tag validation fails for valid tags

**Problem:** Tags that should be valid are being rejected.

**Solution:** Check the project's assigned format and verify the pattern matches your tags:
```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { tagFormat: true }
})

console.log('Project format:', project.tagFormat?.pattern)
```

### Project uses wrong format

**Problem:** Project is using company default instead of project-specific format.

**Solution:** Verify the project has `tagFormatId` set:
```typescript
await prisma.project.update({
  where: { id: projectId },
  data: { tagFormatId: correctFormatId }
})
```

## Best Practices

1. **Always set a company default** - Mark one format as `isDefault: true` per company
2. **Use descriptive names** - "Vessel Standard", "FPSO Format" instead of "Format 1"
3. **Document patterns** - Use the `description` field to explain the pattern
4. **Define rules** - Use the `rules` JSON field to document allowed values for components
5. **Test before deployment** - Validate existing equipment tags against new formats
6. **Communicate changes** - Notify BIM admins when changing project tag formats

## Related Documentation

- [RLS Transaction Safety](./RLS_TRANSACTION_SAFETY.md)
- [BIM Watch Folder](./BIM_WATCH_FOLDER.md)
- Database Schema: `packages/db/prisma/schema.prisma`
- Validation Logic: `packages/core/src/naming-mask.ts`
