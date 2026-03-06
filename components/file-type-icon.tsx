import { FileText, FileImage, FileSpreadsheet, File, FileCode } from "lucide-react";

interface FileTypeIconProps {
  mimeType: string;
  className?: string;
}

export function FileTypeIcon({ mimeType, className = "w-5 h-5" }: FileTypeIconProps) {
  if (mimeType === "application/pdf") {
    return <FileText className={`${className} text-red-500`} />;
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return <FileText className={`${className} text-blue-500`} />;
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return <FileSpreadsheet className={`${className} text-green-500`} />;
  }
  if (mimeType.startsWith("image/")) {
    return <FileImage className={`${className} text-purple-500`} />;
  }
  if (
    mimeType === "application/acad" ||
    mimeType === "image/vnd.dwg" ||
    mimeType === "application/dwg" ||
    mimeType.includes("dwg") ||
    mimeType.includes("dxf")
  ) {
    return <FileCode className={`${className} text-blue-600`} />;
  }
  return <File className={`${className} text-neutral-400`} />;
}
