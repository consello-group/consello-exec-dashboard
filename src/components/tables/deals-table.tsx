"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Deal {
  id: string;
  name: string;
  pipelineLabel: string | null;
  stageLabel: string | null;
  amount: number | null;
  ownerName: string | null;
  daysInStage: number | null;
  lastModified: string;
  isStale: boolean;
}

interface DealsTableProps {
  deals: Deal[];
  loading?: boolean;
}

type SortKey = keyof Deal;
type SortDir = "asc" | "desc";

function formatAmount(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(dateStr: string): string {
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
  if (sortKey !== column)
    return <ChevronsUpDown size={13} className="text-[#2a2a3a]" />;
  return sortDir === "asc" ? (
    <ChevronUp size={13} className="text-[#94a3b8]" />
  ) : (
    <ChevronDown size={13} className="text-[#94a3b8]" />
  );
}

export function DealsTable({ deals, loading = false }: DealsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
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
    if (!sortKey) return deals;
    return [...deals].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [deals, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-[#1a1a26]" />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#94a3b8] text-sm">
        No deals found
      </div>
    );
  }

  const thClass =
    "text-xs font-semibold text-[#94a3b8] uppercase tracking-wider select-none cursor-pointer hover:text-[#f1f5f9] transition-colors";

  return (
    <div className="rounded-xl border border-[#2a2a3a] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-[#2a2a3a] hover:bg-transparent bg-[#0a0a0f]">
            <TableHead
              className={thClass}
              onClick={() => handleSort("name")}
            >
              <span className="flex items-center gap-1">
                Deal Name
                <SortIcon column="name" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={thClass}
              onClick={() => handleSort("pipelineLabel")}
            >
              <span className="flex items-center gap-1">
                Pipeline
                <SortIcon column="pipelineLabel" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={thClass}
              onClick={() => handleSort("stageLabel")}
            >
              <span className="flex items-center gap-1">
                Stage
                <SortIcon column="stageLabel" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={cn(thClass, "text-right")}
              onClick={() => handleSort("amount")}
            >
              <span className="flex items-center justify-end gap-1">
                Amount
                <SortIcon column="amount" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={thClass}
              onClick={() => handleSort("ownerName")}
            >
              <span className="flex items-center gap-1">
                Owner
                <SortIcon column="ownerName" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={cn(thClass, "text-right")}
              onClick={() => handleSort("daysInStage")}
            >
              <span className="flex items-center justify-end gap-1">
                Days in Stage
                <SortIcon column="daysInStage" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead
              className={thClass}
              onClick={() => handleSort("lastModified")}
            >
              <span className="flex items-center gap-1">
                Last Modified
                <SortIcon column="lastModified" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((deal) => (
            <TableRow
              key={deal.id}
              className={cn(
                "border-[#2a2a3a] transition-colors",
                deal.isStale
                  ? "hover:bg-[#1a1a26] bg-[#1a1a10]"
                  : "hover:bg-[#1a1a26] bg-[#12121a]"
              )}
            >
              <TableCell
                className={cn(
                  "font-medium text-sm max-w-[180px] truncate",
                  deal.isStale ? "text-[#f59e0b]" : "text-[#f1f5f9]"
                )}
                title={deal.name}
              >
                {deal.name}
              </TableCell>
              <TableCell className="text-sm text-[#94a3b8]">
                {deal.pipelineLabel ?? "—"}
              </TableCell>
              <TableCell className="text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#ff7a5922] text-[#ff7a59] border border-[#ff7a5940]">
                  {deal.stageLabel ?? "—"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-[#f1f5f9] text-right font-medium">
                {formatAmount(deal.amount)}
              </TableCell>
              <TableCell className="text-sm text-[#94a3b8]">
                {deal.ownerName ?? "—"}
              </TableCell>
              <TableCell
                className={cn(
                  "text-sm text-right",
                  deal.daysInStage !== null && deal.daysInStage > 30
                    ? "text-[#f59e0b] font-medium"
                    : "text-[#94a3b8]"
                )}
              >
                {deal.daysInStage !== null ? `${deal.daysInStage}d` : "—"}
              </TableCell>
              <TableCell className="text-sm text-[#94a3b8]">
                {formatDate(deal.lastModified)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default DealsTable;
