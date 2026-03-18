'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

interface OnboardingStep {
  id: string
  label: string
  description: string
  link: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'FIRST_PROJECT_CREATED',
    label: 'Create your first project',
    description: 'Organize documents by project',
    link: '/dashboard/projects',
  },
  {
    id: 'FIRST_DOCUMENT_UPLOADED',
    label: 'Upload your first document',
    description: 'Start managing your documents',
    link: '/dashboard/documents',
  },
  {
    id: 'FIRST_TEAM_MEMBER_INVITED',
    label: 'Invite a team member',
    description: 'Collaborate with your team',
    link: '/dashboard/settings/users',
  },
  {
    id: 'NAMING_MASK_CONFIGURED',
    label: 'Configure naming mask',
    description: 'Set up document naming conventions',
    link: '/dashboard/settings/naming-masks',
  },
  {
    id: 'FIRST_WORKFLOW_STARTED',
    label: 'Start a workflow',
    description: 'Approve and review documents',
    link: '/dashboard/approvals',
  },
]

/**
 * OnboardingChecklist component
 *
 * Displays onboarding progress with links to complete each step.
 * Auto-collapses when all steps are completed.
 * Shown in sidebar when steps are incomplete.
 */
export function OnboardingChecklist() {
  const [onboarding, setOnboarding] = useState<{ completedSteps: string[] } | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOnboarding = async () => {
      try {
        const response = await fetch('/api/company/onboarding')
        if (response.ok) {
          const data = await response.json()
          setOnboarding(data.onboarding)

          // Auto-collapse if all steps completed
          if (data.onboarding.completedSteps.length === ONBOARDING_STEPS.length) {
            setIsCollapsed(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch onboarding status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnboarding()
  }, [])

  if (isLoading || !onboarding) {
    return null
  }

  const completedSteps = onboarding.completedSteps || []
  const progress = (completedSteps.length / ONBOARDING_STEPS.length) * 100
  const allCompleted = completedSteps.length === ONBOARDING_STEPS.length

  // Don't show if all completed and collapsed
  if (allCompleted && isCollapsed) {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription className="text-xs">
              {completedSteps.length} of {ONBOARDING_STEPS.length} completed
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id)
            return (
              <Link
                key={step.id}
                href={step.link}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </Link>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
