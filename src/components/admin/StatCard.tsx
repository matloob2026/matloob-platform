import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "flat" };
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="group flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-lg">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 transition-transform duration-300 group-hover:scale-105">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-extrabold text-navy-950">{value}</p>
        <p className="text-sm text-text-500">{label}</p>
        {trend && (
          <p
            className={clsx(
              "mt-0.5 text-xs font-bold",
              trend.direction === "up" && "text-emerald-600",
              trend.direction === "down" && "text-red-600",
              trend.direction === "flat" && "text-text-400"
            )}
          >
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
