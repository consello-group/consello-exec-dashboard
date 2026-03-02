"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Users,
  TrendingUp,
  GitBranch,
  Network,
  Activity,
  Calendar,
  Settings,
  Brain,
  Building2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const TERRACOTTA = "#A64A30";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSectionProps {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

function NavSection({ title, icon, items, defaultOpen = true }: NavSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-[#111111]"
        style={{ color: "#3a3a3a" }}
      >
        <span style={{ color: "#3a3a3a" }}>{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          size={12}
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>

      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === ""
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                    isActive
                      ? "text-white bg-[#161616]"
                      : "text-[#5a5a5a] hover:text-white hover:bg-[#111111]"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r"
                      style={{ backgroundColor: TERRACOTTA }}
                    />
                  )}
                  <span
                    style={{ color: isActive ? TERRACOTTA : undefined }}
                    className="flex-shrink-0"
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const aiNavItems: NavItem[] = [
  { label: "Overview",    href: "/",            icon: <BarChart3 size={16} /> },
  { label: "Users",       href: "/users",        icon: <Users size={16} /> },
  { label: "Productivity",href: "/productivity", icon: <TrendingUp size={16} /> },
];

const crmNavItems: NavItem[] = [
  { label: "Pipeline",    href: "/pipeline",     icon: <GitBranch size={16} /> },
  { label: "Relationships",href:"/relationships",icon: <Network size={16} /> },
  { label: "CRM Health",  href: "/crm-health",   icon: <Activity size={16} /> },
  { label: "CRM Activity",href: "/crm-activity", icon: <Calendar size={16} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-screen"
      style={{
        minWidth: "15rem",
        backgroundColor: "#000000",
        borderRight: "1px solid #1e1e1e",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <p className="text-sm font-bold tracking-widest uppercase text-white">
          Consello
        </p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: TERRACOTTA }}>
          Executive Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        <NavSection
          title="AI Intelligence"
          icon={<Brain size={13} />}
          items={aiNavItems}
          defaultOpen={true}
        />
        <NavSection
          title="CRM Intelligence"
          icon={<Building2 size={13} />}
          items={crmNavItems}
          defaultOpen={true}
        />
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid #1e1e1e" }}>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            isSettings
              ? "text-white bg-[#161616]"
              : "text-[#5a5a5a] hover:text-white hover:bg-[#111111]"
          )}
        >
          <Settings size={16} style={{ color: isSettings ? TERRACOTTA : undefined }} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
