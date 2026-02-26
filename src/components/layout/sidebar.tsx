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

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSectionProps {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
  accentColor: string;
  defaultOpen?: boolean;
}

function NavSection({
  title,
  icon,
  items,
  accentColor,
  defaultOpen = true,
}: NavSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const pathname = usePathname();

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-[#1a1a26]"
        style={{ color: "#94a3b8" }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          size={14}
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
                      ? "text-[#f1f5f9] bg-[#1a1a26]"
                      : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a1a26]/50"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                      style={{ backgroundColor: accentColor }}
                    />
                  )}
                  <span
                    style={{ color: isActive ? accentColor : undefined }}
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
  {
    label: "Overview",
    href: "/",
    icon: <BarChart3 size={16} />,
  },
  {
    label: "Users",
    href: "/users",
    icon: <Users size={16} />,
  },
  {
    label: "Productivity",
    href: "/productivity",
    icon: <TrendingUp size={16} />,
  },
];

const crmNavItems: NavItem[] = [
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: <GitBranch size={16} />,
  },
  {
    label: "Relationships",
    href: "/relationships",
    icon: <Network size={16} />,
  },
  {
    label: "CRM Health",
    href: "/crm-health",
    icon: <Activity size={16} />,
  },
  {
    label: "CRM Activity",
    href: "/crm-activity",
    icon: <Calendar size={16} />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-screen border-r border-[#2a2a3a] bg-[#0a0a0f]"
      style={{ minWidth: "15rem" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2a2a3a]">
        <p className="text-base font-bold text-[#f1f5f9] leading-tight">
          Consello
        </p>
        <p className="text-xs text-[#94a3b8] mt-0.5">Executive Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavSection
          title="AI Intelligence"
          icon={<Brain size={14} />}
          items={aiNavItems}
          accentColor="#3b82f6"
          defaultOpen={true}
        />
        <NavSection
          title="CRM Intelligence"
          icon={<Building2 size={14} />}
          items={crmNavItems}
          accentColor="#ff7a59"
          defaultOpen={true}
        />
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4 border-t border-[#2a2a3a] pt-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            isSettings
              ? "text-[#f1f5f9] bg-[#1a1a26]"
              : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a1a26]/50"
          )}
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
