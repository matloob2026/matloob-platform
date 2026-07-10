"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import clsx from "clsx";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex items-center justify-center gap-1 border-t border-border px-4 py-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition hover:bg-surface-muted disabled:opacity-30"
        aria-label="السابق"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-text-400">…</span>}
          <button
            onClick={() => onPageChange(p)}
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition",
              p === page ? "bg-navy-950 text-white" : "text-text-700 hover:bg-surface-muted"
            )}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition hover:bg-surface-muted disabled:opacity-30"
        aria-label="التالي"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  );
}
