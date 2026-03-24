import { DocumentStatus, IssuePurpose, WatermarkStatus } from '@docuroute/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DocumentStatusBadgeProps {
  status: DocumentStatus
  issuePurpose?: IssuePurpose
  watermarkStatus?: WatermarkStatus
  className?: string
}

export function DocumentStatusBadge({
  status,
  issuePurpose,
  watermarkStatus,
  className,
}: DocumentStatusBadgeProps) {
  // Display rules (in order of precedence)
  
  // FOR_CONSTRUCTION + ACTIVE → green pill
  if (issuePurpose === IssuePurpose.FOR_CONSTRUCTION && status === DocumentStatus.ACTIVE) {
    return (
      <Badge className={cn('bg-green-600 text-white', className)}>
        ✅ Approved for Construction
      </Badge>
    )
  }

  // FOR_CONSTRUCTION + SUPERSEDED → alarming red pill with pulse
  if (issuePurpose === IssuePurpose.FOR_CONSTRUCTION && status === DocumentStatus.SUPERSEDED) {
    return (
      <Badge className={cn('bg-red-600 text-white animate-pulse font-bold', className)}>
        ⛔ DO NOT USE — Superseded
      </Badge>
    )
  }

  // SUPERSEDED (non-construction) → red banner
  if (status === DocumentStatus.SUPERSEDED) {
    return (
      <Badge variant="destructive" className={cn('font-semibold', className)}>
        SUPERSEDED — Do Not Use
      </Badge>
    )
  }

  // FOR_CONSTRUCTION + SKIPPED_TOO_LARGE → amber warning
  if (
    issuePurpose === IssuePurpose.FOR_CONSTRUCTION &&
    watermarkStatus === WatermarkStatus.SKIPPED_TOO_LARGE
  ) {
    return (
      <Badge className={cn('bg-amber-500 text-white', className)}>
        ⚠ QR verification unavailable — file too large
      </Badge>
    )
  }

  // PENDING → amber
  if (status === DocumentStatus.PENDING) {
    return (
      <Badge className={cn('bg-amber-500 text-white', className)}>
        Pending Scan
      </Badge>
    )
  }

  // ACTIVE → green
  if (status === DocumentStatus.ACTIVE) {
    return (
      <Badge className={cn('bg-green-600 text-white', className)}>
        Active
      </Badge>
    )
  }

  // QUARANTINED → red
  if (status === DocumentStatus.QUARANTINED) {
    return (
      <Badge variant="destructive" className={className}>
        Quarantined
      </Badge>
    )
  }

  // ARCHIVED → gray
  if (status === DocumentStatus.ARCHIVED) {
    return (
      <Badge variant="secondary" className={className}>
        Archived
      </Badge>
    )
  }

  // Default
  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  )
}
