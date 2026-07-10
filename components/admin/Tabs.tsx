"use client";

import { useState } from "react";
import clsx from "clsx";

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ items, defaultKey }: { items: TabItem[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key);

  return (
    <div>
      <div className="admin-scroll mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={clsx(
              "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition",
              active === item.key
                ? "border-teal-500 text-navy-950"
                : "border-transparent text-text-400 hover:text-text-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.find((i) => i.key === active)?.content}
    </div>
  );
}
