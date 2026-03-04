import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  FolderOpen,
  Users,
  Plus,
  ArrowRight,
  Upload,
  TrendingUp,
  Clock,
} from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [projectCount, documentCount, userCount, recentDocs] = await Promise.all([
    prisma.project.count({ where: { companyId: user.companyId } }),
    prisma.document.count({ where: { companyId: user.companyId } }),
    prisma.user.count({ where: { companyId: user.companyId } }),
    prisma.document.findMany({
      where: { companyId: user.companyId },
      include: {
        uploadedBy: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  const stats = [
    {
      label: 'Active Projects',
      value: projectCount,
      icon: FolderOpen,
      href: '/projects',
      linkLabel: 'View projects',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Documents',
      value: documentCount,
      icon: FileText,
      href: '/documents',
      linkLabel: 'Browse documents',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Team Members',
      value: userCount,
      icon: Users,
      href: '/settings/team',
      linkLabel: 'Manage team',
      color: 'bg-violet-50 text-violet-600',
    },
  ]

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Good day, {user.name.split(' ')[0]} 👷
          </h1>
          <p className="text-stone-500 mt-0.5 text-sm">{user.company.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/projects">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-stone-200 text-stone-700 hover:bg-stone-100"
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </Button>
          </Link>
          <Link href="/documents">
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" /> Upload Doc
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-stone-200 bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{s.label}</p>
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mb-1">{s.value}</p>
            <Link href={s.href} className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              {s.linkLabel} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>

      {/* Quick actions banner */}
      {documentCount === 0 && (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-stone-900 text-sm">Upload your first document</p>
              <p className="text-stone-500 text-xs mt-0.5">Get started by uploading a drawing, report, or permit.</p>
            </div>
          </div>
          <Link href="/documents">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 flex-shrink-0">
              Upload Now <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Recent Documents */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-400" />
            <h2 className="font-semibold text-sm text-stone-900">Recent Documents</h2>
          </div>
          <Link href="/documents">
            <Button variant="ghost" size="sm" className="text-xs text-stone-500 hover:text-stone-900 gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="h-10 w-10 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">No documents yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentDocs.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors group">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate group-hover:text-blue-700 transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-stone-400 truncate mt-0.5">
                      {doc.uploadedBy.name}
                      {doc.project && (
                        <span>
                          {' '}·{' '}
                          <span className="text-stone-500">{doc.project.name}</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal bg-stone-100 text-stone-500 border-0"
                    >
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Growth nudge */}
      {documentCount > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4">
          <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-stone-600">
            Your team has managed{' '}
            <strong className="text-stone-900">{documentCount} document{documentCount !== 1 ? 's' : ''}</strong>{' '}
            across{' '}
            <strong className="text-stone-900">{projectCount} project{projectCount !== 1 ? 's' : ''}</strong>.
          </p>
          <Link href="/settings/team" className="ml-auto flex-shrink-0">
            <Button variant="outline" size="sm" className="border-stone-200 text-stone-600 hover:bg-stone-50 text-xs gap-1">
              <Users className="h-3 w-3" /> Invite team
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
