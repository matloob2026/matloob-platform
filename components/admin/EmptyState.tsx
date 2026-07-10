import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-text-400">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-bold text-navy-950">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-text-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
