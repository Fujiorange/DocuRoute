import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for small teams getting started',
    badge: null,
    features: ['Up to 5 users', '3 projects', '1 GB storage', 'Basic document management', 'Email support'],
    cta: 'Get Started Free',
    ctaVariant: 'outline' as const,
    href: '/register',
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For growing teams with more needs',
    badge: 'Most Popular',
    features: ['Up to 25 users', 'Unlimited projects', '50 GB storage', 'Advanced document management', 'Team invitations', 'Priority support'],
    cta: 'Start Professional',
    ctaVariant: 'default' as const,
    href: '/register',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    badge: null,
    features: ['Unlimited users', 'Unlimited projects', 'Unlimited storage', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    href: 'mailto:sales@docuroute.com',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <Link href="/" className="font-bold text-xl text-blue-600">DocuRoute</Link>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/register"><Button>Get Started</Button></Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-gray-900">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600">Choose the plan that fits your team</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.badge ? 'border-blue-500 shadow-lg' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.badge && <Badge>{plan.badge}</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button variant={plan.ctaVariant} className="w-full">{plan.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t py-8 px-4 text-center text-gray-500 text-sm">
        <p>© 2024 DocuRoute. All rights reserved.</p>
      </footer>
    </div>
  )
}
