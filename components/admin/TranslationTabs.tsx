"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Locale } from "@/types/domain";

const LOCALES: { key: Locale; label: string }[] = [
  { key: "ar", label: "العربية" },
  { key: "en", label: "English" },
];

/**
 * Generic translation-tab editor. Any admin form for a translatable
 * entity (Category, City, Country, HomepageStat, TrustBadge,
 * PageContent) composes this instead of hand-building an ar/en switcher
 * per entity — see docs/ADMIN_DASHBOARD.md "Why a generic
 * TranslationTabs component matters."
 */
export function TranslationTabs({
  render,
}: {
  render: (locale: Locale) => React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>("ar");

  return (
    <div className="rounded-lg border border-border">
      <div className="flex border-b border-border">
        {LOCALES.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLocale(l.key)}
            className={clsx(
              "flex-1 px-4 py-2 text-sm font-bold transition",
              locale === l.key
                ? "border-b-2 border-teal-500 text-navy-950"
                : "text-text-400 hover:text-text-700"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="p-4">{render(locale)}</div>
    </div>
  );
}
