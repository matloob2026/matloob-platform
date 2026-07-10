"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/Card";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Renders mock time-series data. Real implementation (Phase 3+) feeds
 * this from an analytics service aggregating Request/Offer/User counts
 * by day/week — the component itself doesn't change, only the data
 * source does.
 */
export function AreaChartCard({
  title,
  data,
  color = "#0C93A8",
}: {
  title: string;
  data: ChartPoint[];
  color?: string;
}) {
  return (
    <Card>
      <h3 className="mb-4 font-display text-sm font-bold text-navy-950">{title}</h3>
      <div className="h-56 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E1EDEF" vertical={false} />
            <XAxis dataKey="label" fontSize={11} stroke="#93A5B2" tickLine={false} axisLine={false} />
            <YAxis fontSize={11} stroke="#93A5B2" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #E1EDEF", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fill-${title})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function BarChartCard({
  title,
  data,
  color = "#163A6B",
}: {
  title: string;
  data: ChartPoint[];
  color?: string;
}) {
  return (
    <Card>
      <h3 className="mb-4 font-display text-sm font-bold text-navy-950">{title}</h3>
      <div className="h-56 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E1EDEF" vertical={false} />
            <XAxis dataKey="label" fontSize={11} stroke="#93A5B2" tickLine={false} axisLine={false} />
            <YAxis fontSize={11} stroke="#93A5B2" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #E1EDEF", fontSize: 12 }}
            />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
