"use client";

import { useState } from "react";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const CHATGPT = "#F6D1A3"; // apricot
const CLAUDE  = "#A64A30"; // terracotta
const MUTED   = "#666666";
const GRID    = "#1F1F1F";

interface PlatformActivityProps {
  usageData: Array<{ date: string; chatgpt: number; claude: number; total: number }>;
  costData: Array<{ date: string; chatgpt: number; claude: number; total: number }>;
  dauData: Array<{ date: string; dau: number }>;
}

type Tab = "Usage" | "Costs" | "DAU";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCostFull(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

function tickFmt(value: string): string {
  try { return format(parseISO(value), "MMM d"); } catch { return value; }
}

function UsageTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  let lbl = label ?? "";
  try { lbl = format(parseISO(label ?? ""), "MMM d, yyyy"); } catch { /* raw */ }
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2A2A2A" }}>
      <p className="font-semibold text-white mb-2">{lbl}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: e.color }} />
          <span style={{ color: MUTED }}>{e.name === "chatgpt" ? "ChatGPT" : e.name === "claude" ? "Claude" : e.name}:</span>
          <span className="text-white font-medium">{typeof e.value === "number" && e.value > 1000 ? formatTokens(e.value) : e.value}</span>
        </div>
      ))}
    </div>
  );
}

function CostTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  let lbl = label ?? "";
  try { lbl = format(parseISO(label ?? ""), "MMM d, yyyy"); } catch { /* raw */ }
  const total = payload.reduce((s, e) => s + (e.value ?? 0), 0);
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ backgroundColor: "#0A0A0A", border: "1px solid #2A2A2A" }}>
      <p className="font-semibold text-white mb-2">{lbl}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: e.color }} />
          <span style={{ color: MUTED }}>{e.name === "chatgpt" ? "ChatGPT" : "Claude"}:</span>
          <span className="text-white font-medium">{formatCostFull(e.value)}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 flex gap-2" style={{ borderTop: "1px solid #2A2A2A" }}>
        <span style={{ color: MUTED }}>Total:</span>
        <span className="text-white font-semibold">{formatCostFull(total)}</span>
      </div>
    </div>
  );
}

export function PlatformActivity({ usageData, costData, dauData }: PlatformActivityProps) {
  const [tab, setTab] = useState<Tab>("Usage");

  return (
    <div>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-white">Platform Activity</span>
        <div
          className="flex gap-0.5 rounded-lg p-0.5"
          style={{ backgroundColor: "#1A1A1A" }}
        >
          {(["Usage", "Costs", "DAU"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: tab === t ? "#0A0A0A" : "transparent",
                color: tab === t ? "#ffffff" : MUTED,
                border: "none",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {tab === "Usage" && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={usageData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tickFormatter={formatTokens} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<UsageTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="chatgpt" stackId="a" fill={CHATGPT} radius={[0, 0, 0, 0]} />
            <Bar dataKey="claude" stackId="a" fill={CLAUDE} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {tab === "Costs" && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={costData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gChatgptCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHATGPT} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CHATGPT} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gClaudeCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CLAUDE} stopOpacity={0.3} />
                <stop offset="100%" stopColor={CLAUDE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tickFormatter={v => `$${v}`} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<CostTooltip />} />
            <Area type="monotone" dataKey="chatgpt" stroke={CHATGPT} fill="url(#gChatgptCost)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CHATGPT }} />
            <Area type="monotone" dataKey="claude" stroke={CLAUDE} fill="url(#gClaudeCost)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: CLAUDE }} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {tab === "DAU" && (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dauData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={tickFmt} tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<UsageTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="dau" name="Daily Active Users" fill={CLAUDE} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      {(tab === "Usage" || tab === "Costs") && (
        <div className="flex gap-5 justify-center mt-3">
          {[{ label: "ChatGPT", color: CHATGPT }, { label: "Claude", color: CLAUDE }].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
