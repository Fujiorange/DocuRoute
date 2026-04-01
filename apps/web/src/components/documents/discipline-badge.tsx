import { EngineeringDiscipline } from '@docuroute/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DisciplineBadgeProps {
  discipline: string | null | undefined
  className?: string
}

/**
 * DisciplineBadge component
 *
 * Displays engineering discipline with color coding
 */
export function DisciplineBadge({ discipline, className }: DisciplineBadgeProps) {
  if (!discipline) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        -
      </Badge>
    )
  }

  // Color mapping for disciplines
  const colorMap: Record<string, string> = {
    [EngineeringDiscipline.PIPING]: 'bg-blue-100 text-blue-800 border-blue-200',
    [EngineeringDiscipline.STRUCTURAL]: 'bg-gray-100 text-gray-800 border-gray-200',
    [EngineeringDiscipline.ELECTRICAL]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [EngineeringDiscipline.HVAC]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    [EngineeringDiscipline.MECHANICAL]: 'bg-orange-100 text-orange-800 border-orange-200',
    [EngineeringDiscipline.INSTRUMENTATION]: 'bg-purple-100 text-purple-800 border-purple-200',
    [EngineeringDiscipline.CIVIL]: 'bg-stone-100 text-stone-800 border-stone-200',
    [EngineeringDiscipline.ARCHITECTURAL]: 'bg-pink-100 text-pink-800 border-pink-200',
    [EngineeringDiscipline.PROCESS]: 'bg-green-100 text-green-800 border-green-200',
    [EngineeringDiscipline.SAFETY]: 'bg-red-100 text-red-800 border-red-200',
    [EngineeringDiscipline.MARINE]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    [EngineeringDiscipline.GENERAL]: 'bg-slate-100 text-slate-800 border-slate-200',
  }

  const colorClass = colorMap[discipline] || 'bg-slate-100 text-slate-800 border-slate-200'

  // Format discipline name for display
  const displayName = discipline
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {displayName}
    </Badge>
  )
}
