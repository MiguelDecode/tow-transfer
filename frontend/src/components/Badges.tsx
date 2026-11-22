import { statusLabels, urgencyLabels } from "../lib/labels";
import type { TransferStatus, Urgency } from "../lib/types";

const statusStyles: Record<TransferStatus, string> = {
  PENDING: "bg-slate-200 text-slate-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const urgencyStyles: Record<Urgency, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-slate-200 text-slate-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-red-100 text-red-800",
};

const base = "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function StatusBadge({ status }: { status: TransferStatus }) {
  return (
    <span className={`${base} ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`${base} ${urgencyStyles[urgency]}`}>
      {urgencyLabels[urgency]}
    </span>
  );
}
