"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { FileTypeIcon } from "@/components/file-type-icon";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import {
  ChevronRight,
  Download,
  Trash2,
  MessageSquare,
  Clock,
  Shield,
  Send,
} from "lucide-react";

interface DocumentDetail {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  project?: { id: string; name: string };
  folder?: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  approvedBy?: { id: string; name: string } | null;
  comments: Comment[];
  versions: DocumentVersion[];
  auditLogs: AuditEntry[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  changeNote?: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
  details?: string;
}

type Tab = "details" | "versions" | "comments" | "audit";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchDoc = async () => {
    try {
      const [docRes, commentsRes, auditRes] = await Promise.all([
        fetch(`/api/documents-v2?id=${id}`),
        fetch(`/api/documents-v2/${id}/comments`),
        fetch(`/api/documents-v2/${id}/audit`).catch(() => ({ json: async () => ({ logs: [] }) })),
      ]);

      if (!docRes.ok) {
        toast({ title: "Not found", description: "Document not found", variant: "destructive" });
        router.push("/dashboard/documents");
        return;
      }

      const docData = await docRes.json();
      const commentsData = await commentsRes.json();
      const auditData = await (auditRes as Response).json().catch(() => ({ logs: [] }));

      const document = docData.documents?.[0] || docData.document;
      if (!document) {
        router.push("/dashboard/documents");
        return;
      }

      setDoc({
        ...document,
        comments: commentsData.comments || [],
        versions: document.versions || [],
        auditLogs: auditData.logs || [],
        tags: document.tags || [],
      });
    } catch {
      toast({ title: "Error", description: "Failed to load document", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDoc();
  }, [id]);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/documents-v2/${id}/download`);
      if (!res.ok) throw new Error("Download failed");
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate download link", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${doc?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents-v2/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Deleted", description: "Document deleted successfully" });
      router.push("/dashboard/documents");
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/documents-v2/${id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast({ title: "Status updated", description: `Document marked as ${newStatus}` });
      await fetchDoc();
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/documents-v2/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      if (!res.ok) throw new Error("Comment failed");
      setComment("");
      await fetchDoc();
    } catch {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const canApprove = user?.role === "it_admin" || user?.role === "project_admin";
  const canDelete = user?.role === "it_admin";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
        <Link href="/dashboard" className="hover:text-neutral-700">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/documents" className="hover:text-neutral-700">Documents</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-neutral-900 font-medium truncate max-w-[200px]">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileTypeIcon mimeType={doc.mimeType} className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-neutral-900">{doc.title}</h1>
                <StatusBadge status={doc.status} />
                {doc.isEncrypted && (
                  <Badge className="bg-green-50 text-green-600 border-green-100 gap-1">
                    <Shield className="w-3 h-3" /> Encrypted
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-neutral-500 flex-wrap">
                <span>{doc.fileName}</span>
                <span>·</span>
                <span>{formatBytes(doc.fileSize)}</span>
                <span>·</span>
                <span>Uploaded by {doc.createdBy.name}</span>
                <span>·</span>
                <span>{new Date(doc.createdAt).toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" /> Download
            </Button>

            {canApprove && doc.status !== "approved" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={() => handleStatusChange("approved")}
                disabled={statusUpdating}
              >
                Approve
              </Button>
            )}
            {canApprove && doc.status === "draft" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => handleStatusChange("pending")}
                disabled={statusUpdating}
              >
                Submit for Review
              </Button>
            )}
            {canApprove && doc.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
                onClick={() => handleStatusChange("rejected")}
                disabled={statusUpdating}
              >
                Reject
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-1">
          {(["details", "versions", "comments", "audit"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab === "audit" ? "Audit Log" : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
          {doc.description && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-neutral-700 leading-relaxed">{doc.description}</p>
            </div>
          )}
          {doc.project && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Project</p>
              <Link href={`/dashboard/projects/${doc.project.id}`} className="text-primary-600 hover:underline">
                {doc.project.name}
              </Link>
            </div>
          )}
          {doc.tags && doc.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Status</p>
              <StatusBadge status={doc.status} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Encryption</p>
              <p className="text-sm text-neutral-700">
                {doc.isEncrypted ? "AES-256-GCM ✓" : "Not encrypted"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Uploaded</p>
              <p className="text-sm text-neutral-700">{new Date(doc.createdAt).toLocaleString("en-SG")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Last updated</p>
              <p className="text-sm text-neutral-700">{new Date(doc.updatedAt).toLocaleString("en-SG")}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "versions" && (
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          {doc.versions.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p>No version history available</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Version</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">File</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Note</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 hidden md:table-cell">Uploaded by</th>
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {doc.versions.map((v) => (
                  <tr key={v.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">v{v.versionNumber}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{v.fileName}</p>
                      <p className="text-xs text-neutral-500">{formatBytes(v.fileSize)}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{v.changeNote || "—"}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden md:table-cell">{v.createdBy.name}</td>
                    <td className="px-4 py-3 text-neutral-600 text-xs">
                      {new Date(v.createdAt).toLocaleDateString("en-SG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "comments" && (
        <div className="space-y-4">
          {/* Comment list */}
          <div className="space-y-3">
            {doc.comments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 text-center py-12 text-neutral-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p>No comments yet. Be the first to comment.</p>
              </div>
            ) : (
              doc.comments.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-neutral-100 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary-100 text-primary-600 text-xs font-semibold">
                        {c.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-neutral-900">{c.user.name}</p>
                        <p className="text-xs text-neutral-400">
                          {new Date(c.createdAt).toLocaleString("en-SG")}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-700 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add comment */}
          <form onSubmit={handleAddComment} className="bg-white rounded-xl border border-neutral-100 p-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full border border-neutral-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                type="submit"
                size="sm"
                className="bg-primary-500 hover:bg-primary-600 text-white gap-2"
                disabled={!comment.trim() || submittingComment}
              >
                <Send className="w-4 h-4" />
                {submittingComment ? "Posting…" : "Post Comment"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          {doc.auditLogs.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              <p>No audit log entries available</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-100" />
              <div className="space-y-4">
                {doc.auditLogs.map((entry) => (
                  <div key={entry.id} className="flex gap-4 pl-10 relative">
                    <div className="absolute left-3 top-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 capitalize">
                        {entry.action.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {entry.user?.name || "System"} · {new Date(entry.createdAt).toLocaleString("en-SG")}
                      </p>
                      {entry.details && (
                        <p className="text-xs text-neutral-600 mt-0.5">{entry.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
