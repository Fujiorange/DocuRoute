"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  FileText,
  MoreHorizontal,
  Download,
  Trash2,
  Plus,
  FolderOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Document, Project } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", description: "", projectId: "" });
  const [filterProject, setFilterProject] = useState("all");

  const fetchData = async () => {
    const [docsRes, projRes] = await Promise.all([
      fetch("/api/documents-v2").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]);
    setDocuments(docsRes.documents || []);
    setProjects(projRes.projects || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", form.title);
      if (form.description) formData.append("description", form.description);
      if (form.projectId && form.projectId !== "none") formData.append("projectId", form.projectId);

      const res = await fetch("/api/documents-v2", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Document uploaded successfully" });
      setDocuments([data.document, ...documents]);
      setForm({ title: "", description: "", projectId: "" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
        return;
      }
      toast({ title: "Document deleted" });
      setDocuments(documents.filter((d) => d.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  };

  const handleDownload = (id: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = `/api/documents/${id}/download`;
    link.download = fileName;
    link.click();
  };

  const filteredDocuments = filterProject === "all"
    ? documents
    : documents.filter((d) => d.projectId === filterProject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Documents</h1>
          <p className="text-neutral-700 mt-1">Upload and manage project documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-500 hover:bg-primary-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Upload a document to your project workspace.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="docfile">File</Label>
                <div
                  className="border-2 border-dashed border-neutral-200 rounded-lg p-6 text-center cursor-pointer hover:border-primary-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5 text-primary-500" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-neutral-700">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-700">Click to select a file</p>
                      <p className="text-xs text-neutral-700 mt-1">PDF, DWG, DOCX, XLSX, PNG, JPG</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  id="docfile"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!form.title) setForm({ ...form, title: f.name.replace(/\.[^.]+$/, "") });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctitle">Title</Label>
                <Input
                  id="doctitle"
                  placeholder="e.g., Foundation Plan Rev. 3"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docdesc">Description (optional)</Label>
                <Textarea
                  id="docdesc"
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filterProject === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterProject("all")}
            className={filterProject === "all" ? "bg-primary-500 hover:bg-primary-600 text-white" : ""}
          >
            All
          </Button>
          {projects.map((p) => (
            <Button
              key={p.id}
              variant={filterProject === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterProject(p.id)}
              className={filterProject === p.id ? "bg-primary-500 hover:bg-primary-600 text-white" : ""}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {/* Documents Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No documents yet</h3>
          <p className="text-neutral-700 mb-6">Upload your first document to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="font-semibold">Document</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Project</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Size</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Uploaded by</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-neutral-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-neutral-700" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{doc.title}</p>
                        <p className="text-xs text-neutral-700 truncate max-w-[200px]">{doc.fileName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {doc.project ? (
                      <Badge variant="outline" className="text-xs">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {doc.project.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-neutral-700">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-neutral-700">
                    {formatFileSize(doc.fileSize)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-neutral-700">
                    {doc.uploadedBy.name}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-neutral-700">
                    {new Date(doc.createdAt).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.fileName)}>
                          <Download className="w-4 h-4 mr-2" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
