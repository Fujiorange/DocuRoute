import { Badge } from "@/components/ui/badge";

type DocumentStatus = "draft" | "pending" | "approved" | "rejected" | string;

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft: {
    label: "Draft",
    classes: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
  pending: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-600 border-amber-100",
  },
  approved: {
    label: "Approved",
    classes: "bg-green-50 text-green-600 border-green-100",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-50 text-red-600 border-red-100",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status?.toLowerCase()] ?? {
    label: status ?? "Unknown",
    classes: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };

  return (
    <Badge
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.classes} ${className}`}
    >
      {config.label}
    </Badge>
  );
}
