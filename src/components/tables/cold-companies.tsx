"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type HealthBucket = "active" | "cooling" | "cold" | "at-risk";

interface Company {
  id: string;
  name: string;
  domain: string | null;
  ownerId: string | null;
  ownerName: string | null;
  lastContacted: string | null;
  lastActivity: string | null;
  associatedContacts: number;
  associatedDeals: number;
  createdAt: string;
  daysSinceContact: number | null;
  healthBucket: HealthBucket;
}

interface ColdCompaniesProps {
  companies: Company[];
}

type SortKey = "name" | "ownerName" | "daysSinceContact" | "associatedContacts" | "associatedDeals";
type SortDir = "asc" | "desc";

const BUCKET_COLORS: Record<HealthBucket, string> = {
  active: "#10a37f",
  cooling: "#f59e0b",
  cold: "#f97316",
  "at-risk": "#ef4444",
};

const BUCKET_LABELS: Record<HealthBucket, string> = {
  active: "Active",
  cooling: "Cooling",
  cold: "Cold",
  "at-risk": "At Risk",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
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

export function ColdCompanies({ companies }: ColdCompaniesProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>("daysSinceContact");
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
    if (!sortKey) return companies;
    return [...companies].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [companies, sortKey, sortDir]);

  if (companies.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-24 text-sm"
        style={{ color: "#94a3b8" }}
      >
        No dormant companies found
      </div>
    );
  }

  const thClass =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none cursor-pointer hover:text-[#f1f5f9] transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2a3a", backgroundColor: "#0a0a0f" }}>
            <th
              className={thClass}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("name")}
            >
              <span className="flex items-center gap-1">
                Company
                <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th className={thClass} style={{ color: "#94a3b8", cursor: "default" }}>
              Status
            </th>
            <th
              className={thClass}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("ownerName")}
            >
              <span className="flex items-center gap-1">
                Owner
                <SortIcon column="ownerName" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th className={thClass} style={{ color: "#94a3b8", cursor: "default" }}>
              Last Contact
            </th>
            <th
              className={thClass}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("daysSinceContact")}
            >
              <span className="flex items-center gap-1">
                Days Silent
                <SortIcon column="daysSinceContact" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th
              className={thClass}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("associatedContacts")}
            >
              <span className="flex items-center gap-1">
                Contacts
                <SortIcon column="associatedContacts" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th
              className={thClass}
              style={{ color: "#94a3b8" }}
              onClick={() => handleSort("associatedDeals")}
            >
              <span className="flex items-center gap-1">
                Deals
                <SortIcon column="associatedDeals" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const color = BUCKET_COLORS[c.healthBucket];
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
                    {c.name}
                  </p>
                  {c.domain && (
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {c.domain}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${color}22`,
                      color,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    {BUCKET_LABELS[c.healthBucket]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>
                  {c.ownerName ?? "Unassigned"}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>
                  {formatDate(c.lastContacted)}
                </td>
                <td
                  className="px-4 py-3 font-mono font-semibold"
                  style={{
                    color:
                      c.daysSinceContact !== null && c.daysSinceContact >= 90
                        ? "#ef4444"
                        : "#f97316",
                  }}
                >
                  {c.daysSinceContact !== null ? `${c.daysSinceContact}d` : "—"}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: "#94a3b8" }}>
                  {c.associatedContacts}
                </td>
                <td className="px-4 py-3 text-center" style={{ color: "#94a3b8" }}>
                  {c.associatedDeals}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ColdCompanies;
