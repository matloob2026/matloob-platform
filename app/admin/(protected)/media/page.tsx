"use client";

import { useEffect, useState } from "react";
import { UploadCloud, Trash2, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/admin/Skeleton";
import { listMediaMock, type AdminMediaItem } from "@/services/mock/media.mock";

const OWNER_LABEL: Record<string, string> = {
  REQUEST: "طلب",
  CATEGORY: "تصنيف",
  HOMEPAGE_HERO: "الصفحة الرئيسية",
  USER_PROFILE: "ملف مستخدم",
  ADMIN_UPLOAD: "رفع يدوي",
};

export default function AdminMediaPage() {
  const [items, setItems] = useState<AdminMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);
    listMediaMock(search || undefined).then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, [search]);

  return (
    <div>
      <PageHeader
        title="مكتبة الوسائط"
        description="مصدر واحد لكل الصور المستخدمة في المنصة — الطلبات، التصنيفات، الصفحة الرئيسية، والملفات الشخصية"
        actions={
          <Button>
            <UploadCloud className="h-4 w-4" /> رفع صورة جديدة
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن صورة..."
              className="w-full rounded-lg border border-border-strong py-2 pr-9 pl-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <p className="text-xs text-text-400">{items.length} عنصر</p>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="لا توجد صور"
              description="ابدأ برفع أول صورة لمكتبة الوسائط، أو جرّب كلمة بحث مختلفة."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.altText} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-navy-950/0 opacity-0 transition group-hover:bg-navy-950/50 group-hover:opacity-100">
                    <button className="rounded-lg bg-white/90 p-2 text-navy-950" title="استبدال">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg bg-white/90 p-2 text-red-600" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 rounded bg-navy-950/70 px-1.5 py-0.5 text-[10px] text-white">
                    {OWNER_LABEL[item.ownerType]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
