"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, FileText, HardDrive, Users, Activity } from "lucide-react";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalDocuments: number;
    totalFolders: number;
    storageUsed: string;
    storageLimit: string;
    storageUsedPercentage: number;
  };
  documentsByStatus: Array<{ status: string; _count: { status: number } }>;
  recentActivity: Array<{ action: string; _count: { action: number } }>;
  topUploaders: Array<{
    uploadedById: string;
    _count: { uploadedById: number };
    user?: { id: string; name: string; email: string } | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-400",
  pending: "bg-amber-400",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const STATUS_TEXT: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-neutral-100">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <BarChart2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-700 font-medium">{error}</p>
        <p className="text-sm text-neutral-500 mt-1">
          Analytics are available to IT Admin and Project Admin roles.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { overview, documentsByStatus, recentActivity, topUploaders } = data;
  const storageUsed = Number(overview.storageUsed);
  const storageLimit = Number(overview.storageLimit);
  const storagePercent = Math.min(100, overview.storageUsedPercentage);

  const totalDocs = documentsByStatus.reduce((sum, s) => sum + s._count.status, 0) || 1;

  const stats = [
    { label: "Total Users", value: overview.totalUsers, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Projects", value: overview.totalProjects, icon: BarChart2, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Documents", value: overview.totalDocuments, icon: FileText, color: "text-primary-500", bg: "bg-primary-50" },
    { label: "Folders", value: overview.totalFolders, icon: HardDrive, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Analytics</h1>
        <p className="text-neutral-700 mt-1">Overview of your workspace activity and usage.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-neutral-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-700">{stat.label}</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Storage usage */}
        <Card className="border-neutral-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-neutral-500" /> Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-700">
                <span className="font-semibold text-neutral-900">{formatBytes(storageUsed)}</span> used
              </span>
              <span className="text-neutral-500">{formatBytes(storageLimit)} total</span>
            </div>
            <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent > 85 ? "bg-red-500" : storagePercent > 60 ? "bg-amber-500" : "bg-primary-500"
                }`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500 mt-2">{storagePercent}% of quota used</p>
          </CardContent>
        </Card>

        {/* Document status breakdown */}
        <Card className="border-neutral-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-500" /> Documents by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documentsByStatus.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">No documents yet</p>
            ) : (
              <div className="space-y-3">
                {documentsByStatus.map((s) => {
                  const pct = Math.round((s._count.status / totalDocs) * 100);
                  return (
                    <div key={s.status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-700">{STATUS_TEXT[s.status] || s.status}</span>
                        <span className="font-medium text-neutral-900">{s._count.status}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${STATUS_COLORS[s.status] || "bg-neutral-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-neutral-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-500" /> Activity (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((a) => (
                  <div key={a.action} className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700 capitalize">
                      {a.action.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 bg-neutral-100 rounded-full px-2.5 py-0.5">
                      {a._count.action}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Top Uploaders */}
        <Card className="border-neutral-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" /> Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topUploaders.length > 0 ? (
              <div className="space-y-3">
                {topUploaders.map((u, i) => (
                  <div key={u.uploadedById} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-semibold flex-shrink-0">
                      {u.user?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {u.user?.name || "Unknown"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-700">
                      #{i + 1} · {u._count.uploadedById} docs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">No uploads yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
