"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CreatedToast() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      setVisible(true);
      // Strip the query param so refreshing doesn't re-show the toast.
      router.replace("/my-requests");
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 top-4 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white shadow-xl"
    >
      <span aria-hidden="true">✓</span> تم نشر طلبك بنجاح
    </div>
  );
}
