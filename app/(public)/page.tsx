import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, FolderOpen, Users, Shield, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'Document Management',
    description: 'Upload, organize, and access all your project documents in one place.',
  },
  {
    icon: FolderOpen,
    title: 'Project Organization',
    description: 'Group documents by project for easy navigation and retrieval.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite team members with role-based access control.',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Your documents are stored securely with company-level isolation.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="font-bold text-xl text-blue-600">DocuRoute</div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <Badge className="mb-4" variant="secondary">Built for Singapore Construction</Badge>
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          Document Management
          <br />
          <span className="text-blue-600">That Actually Works</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          DocuRoute helps construction and engineering companies organize, share, and manage project documents with ease.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">View Pricing</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything Your Team Needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{f.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          Join construction companies already using DocuRoute to manage their documents.
        </p>
        <Link href="/register">
          <Button size="lg" variant="secondary">
            Create Your Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-gray-500 text-sm">
        <p>© 2024 DocuRoute. Built for Singapore construction companies.</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
          <Link href="/login" className="hover:text-gray-700">Login</Link>
          <Link href="/register" className="hover:text-gray-700">Register</Link>
        </div>
      </footer>
    </div>
  )
}
