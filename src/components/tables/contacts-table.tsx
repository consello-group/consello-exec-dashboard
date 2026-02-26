"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Contact {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  lifecycleStage: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
  lastModified: string;
}

interface ContactsTableProps {
  contacts: Contact[];
  loading?: boolean;
}

type SortKey = "email" | "company" | "lifecycleStage" | "ownerName" | "lastModified";
type SortDir = "asc" | "desc";

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const STAGE_COLORS: Record<string, string> = {
  subscriber: "#6366f1",
  lead: "#3b82f6",
  marketingqualifiedlead: "#10a37f",
  salesqualifiedlead: "#10a37f",
  opportunity: "#d97706",
  customer: "#ff7a59",
  evangelist: "#f59e0b",
};

function stageColor(stage: string): string {
  return STAGE_COLORS[stage.toLowerCase().replace(/\s+/g, "")] ?? "#94a3b8";
}

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
}) {
  if (sortKey !== column) return <ChevronsUpDown size={12} className="text-[#2a2a3a]" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-[#94a3b8]" />
  ) : (
    <ChevronDown size={12} className="text-[#94a3b8]" />
  );
}

export function ContactsTable({ contacts, loading = false }: ContactsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>("lastModified");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return contacts;
    return [...contacts].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-[#1a1a26]" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-24 text-sm"
        style={{ color: "#94a3b8" }}
      >
        No contacts found
      </div>
    );
  }

  const thClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none cursor-pointer";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2a3a", backgroundColor: "#0a0a0f" }}>
            <th className={thClass} style={{ color: "#94a3b8" }}>
              Contact
            </th>
            <th
              className={cn(thClass, "hover:text-[#f1f5f9]")}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("company")}
            >
              <span className="flex items-center gap-1">
                Company
                <SortIcon column="company" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th className={thClass} style={{ color: "#94a3b8" }}>
              Title
            </th>
            <th
              className={cn(thClass, "hover:text-[#f1f5f9]")}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("lifecycleStage")}
            >
              <span className="flex items-center gap-1">
                Stage
                <SortIcon column="lifecycleStage" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th
              className={cn(thClass, "hover:text-[#f1f5f9]")}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("ownerName")}
            >
              <span className="flex items-center gap-1">
                Owner
                <SortIcon column="ownerName" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th
              className={cn(thClass, "hover:text-[#f1f5f9]")}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("lastModified")}
            >
              <span className="flex items-center gap-1">
                Last Modified
                <SortIcon column="lastModified" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const name =
              [c.firstName, c.lastName].filter(Boolean).join(" ") ||
              c.email?.split("@")[0] ||
              "—";
            return (
              <tr
                key={c.id}
                style={{
                  backgroundColor: i % 2 === 0 ? "#12121a" : "#0f0f18",
                  borderBottom: "1px solid #1e1e2e",
                }}
                className="hover:bg-[#1a1a26] transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "#f1f5f9" }}>
                    {name}
                  </p>
                  {c.email && (
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {c.email}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>
                  {c.company ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                  {c.jobTitle ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {c.lifecycleStage ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${stageColor(c.lifecycleStage)}22`,
                        color: stageColor(c.lifecycleStage),
                        border: `1px solid ${stageColor(c.lifecycleStage)}44`,
                      }}
                    >
                      {c.lifecycleStage}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>
                  {c.ownerName ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                  {formatDate(c.lastModified)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ContactsTable;
