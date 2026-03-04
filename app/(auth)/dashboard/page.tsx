import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, FolderOpen, Users, Plus, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [projectCount, documentCount, userCount, recentDocs] = await Promise.all([
    prisma.project.count({ where: { companyId: user.companyId } }),
    prisma.document.count({ where: { companyId: user.companyId } }),
    prisma.user.count({ where: { companyId: user.companyId } }),
    prisma.document.findMany({
      where: { companyId: user.companyId },
      include: { uploadedBy: { select: { name: true } }, project: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}</h1>
        <p className="text-gray-600 mt-1">{user.company.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Projects</CardTitle>
            <FolderOpen className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projectCount}</div>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
            <FileText className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentCount}</div>
            <Link href="/documents" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Team Members</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userCount}</div>
            <Link href="/settings/team" className="text-sm text-blue-600 hover:underline">Manage team</Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/projects">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Upload Document
            </Button>
          </Link>
          <Link href="/settings/team">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" /> Invite Team Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Latest uploaded documents</CardDescription>
          </div>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentDocs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No documents yet. Upload your first document.</p>
          ) : (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-gray-500">
                          by {doc.uploadedBy.name}
                          {doc.project && ` · ${doc.project.name}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
