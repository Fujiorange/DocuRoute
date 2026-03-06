"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Users, ArrowRight, Upload } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUpload } from "@/components/document-upload";
import type { Project, Document } from "@/types";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/documents-v2").then((r) => r.json()),
      fetch("/api/team").then((r) => r.json()),
    ]).then(([pd, dd, td]) => {
      setProjects(pd.projects || []);
      setDocuments(dd.documents || []);
      setTeamCount(td.totalCount ?? 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Documents", value: documents.length, icon: FileText, color: "text-primary-500", bg: "bg-primary-50" },
    { label: "Team Members", value: teamCount ?? 0, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-neutral-700 mt-1">Here&apos;s what&apos;s happening with your projects today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-neutral-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-700">{stat.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-neutral-900 mt-1">{stat.value}</p>
                  )}
                </div>
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Upload */}
      <Card className="border-neutral-100">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Quick Upload</CardTitle>
          {showUpload && (
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              onClick={() => setShowUpload(false)}
            >
              Cancel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showUpload ? (
            <DocumentUpload
              onUploadSuccess={(doc) => {
                setShowUpload(false);
                fetch("/api/documents-v2").then((r) => r.json()).then((dd) => {
                  setDocuments(dd.documents || []);
                });
              }}
            />
          ) : (
            <button
              onClick={() => setShowUpload(true)}
              className="w-full border-2 border-dashed border-neutral-200 hover:border-primary-300 hover:bg-neutral-50 rounded-xl p-6 text-center transition-all duration-200 cursor-pointer"
            >
              <Upload className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-700">Click to upload a document</p>
              <p className="text-xs text-neutral-500 mt-1">PDF, DWG, DOCX, XLSX — Max 200 MB</p>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Recent content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <Card className="border-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm" className="text-primary-500 hover:text-primary-600 gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-700">No projects yet</p>
                <Link href="/dashboard/projects">
                  <Button size="sm" className="mt-3 bg-primary-500 hover:bg-primary-600 text-white">
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{project.name}</p>
                        <p className="text-xs text-neutral-700">{project._count?.documents ?? 0} documents</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border-neutral-100">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Documents</CardTitle>
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="sm" className="text-primary-500 hover:text-primary-600 gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm text-neutral-700">No documents uploaded yet</p>
                <Link href="/dashboard/documents">
                  <Button size="sm" className="mt-3 bg-primary-500 hover:bg-primary-600 text-white">
                    Upload Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-neutral-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 truncate max-w-[160px]">{doc.title}</p>
                        <p className="text-xs text-neutral-700">{(Number(doc.fileSize) / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    {doc.project && (
                      <Badge variant="outline" className="text-xs">
                        {doc.project.name}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
