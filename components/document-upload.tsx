"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileTypeIcon } from "@/components/file-type-icon";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/dwg",
  "image/vnd.dwg",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.dxf";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface DocumentUploadProps {
  projectId?: string;
  folderId?: string;
  onUploadSuccess?: (document: { id: string; title: string }) => void;
  compact?: boolean;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function DocumentUpload({
  projectId,
  folderId,
  onUploadSuccess,
  compact = false,
}: DocumentUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const validateFile = (f: File): string | null => {
    if (f.size > MAX_FILE_SIZE) {
      return `File exceeds 200 MB limit (${formatBytes(f.size)})`;
    }
    if (
      ACCEPTED_TYPES.length > 0 &&
      !ACCEPTED_TYPES.includes(f.type) &&
      !f.name.match(/\.(dwg|dxf)$/i)
    ) {
      return `File type not supported. Accepted: PDF, DWG, DOCX, XLSX, PNG, JPG`;
    }
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      setErrorMessage(err);
      setUploadState("error");
      return;
    }
    setFile(f);
    setUploadState("idle");
    setErrorMessage("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadState("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));
    if (projectId) formData.append("projectId", projectId);
    if (folderId) formData.append("folderId", folderId);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      const res = await fetch("/api/documents-v2", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setProgress(100);
      setUploadState("success");
      toast({
        title: "Upload successful",
        description: `"${file.name}" has been uploaded successfully.`,
      });
      onUploadSuccess?.(data.document);
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMessage(msg);
      setUploadState("error");
      toast({
        title: "Upload failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (compact && !file) {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleInputChange}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </label>
    );
  }

  return (
    <div className="w-full space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${dragging
              ? "border-primary-500 bg-primary-50"
              : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50"
            }
          `}
        >
          <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="font-medium text-neutral-700 mb-1">
            {dragging ? "Drop your file here" : "Drag & drop your document here"}
          </p>
          <p className="text-sm text-neutral-500">or click to browse files</p>
          <p className="text-xs text-neutral-400 mt-3">
            PDF, DWG, DOCX, XLSX, PNG, JPG — Max 200 MB
          </p>
        </div>
      )}

      {/* File selected */}
      {file && uploadState !== "success" && (
        <div className="border border-neutral-200 rounded-xl p-4 bg-white">
          <div className="flex items-center gap-3">
            <FileTypeIcon mimeType={file.type} className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 truncate">{file.name}</p>
              <p className="text-sm text-neutral-500">{formatBytes(file.size)}</p>
            </div>
            {uploadState === "idle" && (
              <button
                onClick={reset}
                className="text-neutral-400 hover:text-neutral-600"
                type="button"
                aria-label="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {uploadState === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
          </div>

          {/* Progress bar */}
          {uploadState === "uploading" && (
            <div className="mt-3">
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1 text-right">{progress}%</p>
            </div>
          )}

          {/* Error message */}
          {uploadState === "error" && errorMessage && (
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}

          {/* Actions */}
          {uploadState === "idle" && (
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={reset} type="button">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-primary-500 hover:bg-primary-600 text-white"
                onClick={handleUpload}
                type="button"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Upload
              </Button>
            </div>
          )}
          {uploadState === "error" && (
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={reset} type="button">
                Remove
              </Button>
              <Button
                size="sm"
                className="bg-primary-500 hover:bg-primary-600 text-white"
                onClick={handleUpload}
                type="button"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Success state */}
      {uploadState === "success" && (
        <div className="border border-green-100 rounded-xl p-4 bg-green-50 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-green-800">Upload complete</p>
            <p className="text-sm text-green-700">{file?.name} has been uploaded successfully.</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} type="button">
            Upload another
          </Button>
        </div>
      )}
    </div>
  );
}
