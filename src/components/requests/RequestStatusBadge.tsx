import { Badge } from "@/components/ui/Badge";
import type { RequestStatus } from "@/types/domain";

const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  IN_PROGRESS: "قيد التنفيذ",
  FULFILLED: "مكتمل",
  EXPIRED: "منتهي",
  CLOSED_BY_BUYER: "مغلق",
  REMOVED_BY_ADMIN: "أزيل بواسطة الإدارة",
};

const STATUS_TONE: Record<RequestStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  DRAFT: "neutral",
  PUBLISHED: "info",
  IN_PROGRESS: "warning",
  FULFILLED: "success",
  EXPIRED: "neutral",
  CLOSED_BY_BUYER: "neutral",
  REMOVED_BY_ADMIN: "danger",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
