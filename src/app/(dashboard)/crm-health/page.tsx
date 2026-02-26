export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { ContactsTable } from "@/components/tables/contacts-table";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accentColor,
}: {
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-2"
      style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: "#f1f5f9" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Quality score color ──────────────────────────────────────────────────────

function qualityColor(score: number): string {
  if (score >= 80) return "#10a37f";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#d97706";
  return "#ef4444";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CRMHealthPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [contacts, owners] = await Promise.all([
    db.hubSpotContact.findMany(),
    db.hubSpotOwner.findMany(),
  ]);

  const ownerMap = new Map(
    owners.map((o) => [
      o.id,
      `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email,
    ])
  );

  // ── Quality metric calculations ───────────────────────────────────────────
  const total = contacts.length;

  const withEmail = contacts.filter((c) => c.email && c.email.trim()).length;
  const withPhone = contacts.filter((c) => c.phone && c.phone.trim()).length;
  const withCompany = contacts.filter((c) => c.company && c.company.trim()).length;
  const withJobTitle = contacts.filter((c) => c.jobTitle && c.jobTitle.trim()).length;
  const withOwner = contacts.filter((c) => c.ownerId && c.ownerId.trim()).length;
  const unassigned = total - withOwner;

  // Data quality score: weighted average across the 5 completeness fields
  // Weights: email 30%, phone 15%, company 25%, jobTitle 15%, owner 15%
  const qualityScore =
    total > 0
      ? Math.round(
          ((withEmail / total) * 30 +
            (withPhone / total) * 15 +
            (withCompany / total) * 25 +
            (withJobTitle / total) * 15 +
            (withOwner / total) * 15)
        )
      : 0;

  const newThisMonth = contacts.filter(
    (c) => new Date(c.createdAt) >= thirtyDaysAgo
  ).length;

  // ── Lifecycle stage distribution ──────────────────────────────────────────
  const lifecycleMap = new Map<string, number>();
  for (const c of contacts) {
    const stage = c.lifecycleStage ?? "unknown";
    lifecycleMap.set(stage, (lifecycleMap.get(stage) ?? 0) + 1);
  }
  const lifecycleData = Array.from(lifecycleMap.entries())
    .map(([stage, count]) => ({
      stage,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Owner workload ────────────────────────────────────────────────────────
  const ownerLoadMap = new Map<string, number>();
  for (const c of contacts) {
    const ownerId = c.ownerId ?? "unassigned";
    ownerLoadMap.set(ownerId, (ownerLoadMap.get(ownerId) ?? 0) + 1);
  }
  const ownerWorkload = Array.from(ownerLoadMap.entries())
    .map(([ownerId, count]) => ({
      ownerId,
      ownerName:
        ownerId === "unassigned"
          ? "Unassigned"
          : ownerMap.get(ownerId) ?? ownerId,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxOwnerCount = ownerWorkload[0]?.count ?? 1;

  // ── Completeness rows ─────────────────────────────────────────────────────
  const completenessFields = [
    { label: "Email", count: withEmail, color: "#6366f1" },
    { label: "Company", count: withCompany, color: "#3b82f6" },
    { label: "Job Title", count: withJobTitle, color: "#10a37f" },
    { label: "Phone", count: withPhone, color: "#d97706" },
    { label: "Owner", count: withOwner, color: "#ff7a59" },
  ];

  // ── Lifecycle stage colors ────────────────────────────────────────────────
  const stageColors: Record<string, string> = {
    subscriber: "#6366f1",
    lead: "#3b82f6",
    marketingqualifiedlead: "#10a37f",
    salesqualifiedlead: "#10a37f",
    opportunity: "#d97706",
    customer: "#ff7a59",
    evangelist: "#f59e0b",
    other: "#94a3b8",
    unknown: "#2a2a3a",
  };
  function stageColor(stage: string): string {
    return stageColors[stage.toLowerCase().replace(/\s+/g, "")] ?? "#94a3b8";
  }

  // ── Serialize contacts for table (first 50) ────────────────────────────────
  const contactsForTable = contacts.slice(0, 50).map((c) => ({
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    company: c.company,
    jobTitle: c.jobTitle,
    phone: c.phone,
    lifecycleStage: c.lifecycleStage,
    ownerId: c.ownerId,
    ownerName: c.ownerId ? ownerMap.get(c.ownerId) ?? null : null,
    createdAt: c.createdAt.toISOString(),
    lastModified: c.lastModified.toISOString(),
  }));

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          CRM Data Quality
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          {total.toLocaleString()} contacts &middot; Completeness and enrichment analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Contacts"
          value={total.toLocaleString()}
          sub={`${newThisMonth} new this month`}
          accentColor="#6366f1"
        />
        <KpiCard
          label="Data Quality Score"
          value={`${qualityScore}/100`}
          sub="Weighted completeness"
          accentColor={qualityColor(qualityScore)}
        />
        <KpiCard
          label="Unassigned Contacts"
          value={unassigned.toLocaleString()}
          sub={`${total > 0 ? Math.round((unassigned / total) * 100) : 0}% of total`}
          accentColor={unassigned > 0 ? "#ef4444" : "#10a37f"}
        />
        <KpiCard
          label="New This Month"
          value={newThisMonth.toLocaleString()}
          sub="Added in last 30 days"
          accentColor="#10a37f"
        />
      </div>

      {/* Charts grid */}
      {total === 0 ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a", color: "#94a3b8" }}
        >
          No contact data found. Sync HubSpot to populate this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Completeness bars */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
              Field Completeness
            </h2>
            <div className="space-y-4">
              {completenessFields.map((f) => {
                const pct = total > 0 ? Math.round((f.count / total) * 100) : 0;
                return (
                  <div key={f.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm" style={{ color: "#94a3b8" }}>
                        {f.label}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
                        {pct}%
                        <span className="text-xs font-normal ml-1" style={{ color: "#94a3b8" }}>
                          ({f.count.toLocaleString()}/{total.toLocaleString()})
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#0a0a0f" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: f.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lifecycle stage distribution */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
              Lifecycle Stage Distribution
            </h2>
            {lifecycleData.length === 0 ? (
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                No lifecycle stage data.
              </p>
            ) : (
              <div className="space-y-3">
                {lifecycleData.map((l) => (
                  <div key={l.stage} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stageColor(l.stage) }}
                    />
                    <span
                      className="text-sm capitalize flex-1"
                      style={{ color: "#94a3b8" }}
                    >
                      {l.stage === "unknown"
                        ? "Unknown"
                        : l.stage.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#0a0a0f" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${l.percentage}%`,
                          backgroundColor: stageColor(l.stage),
                        }}
                      />
                    </div>
                    <span
                      className="text-sm tabular-nums w-16 text-right"
                      style={{ color: "#f1f5f9" }}
                    >
                      {l.count} ({l.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owner workload */}
          <div
            className="rounded-xl border p-5 md:col-span-2"
            style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#f1f5f9" }}>
              Contacts per Owner
            </h2>
            {ownerWorkload.length === 0 ? (
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                No owner data.
              </p>
            ) : (
              <div className="space-y-3">
                {ownerWorkload.map((o) => {
                  const barPct = Math.round((o.count / maxOwnerCount) * 100);
                  return (
                    <div key={o.ownerId} className="flex items-center gap-3">
                      <span
                        className="text-sm w-36 truncate flex-shrink-0"
                        style={{ color: "#94a3b8" }}
                      >
                        {o.ownerName}
                      </span>
                      <div
                        className="flex-1 h-6 rounded-md overflow-hidden"
                        style={{ backgroundColor: "#0a0a0f" }}
                      >
                        <div
                          className="h-full rounded-md flex items-center px-2"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: o.ownerId === "unassigned" ? "#ef4444" : "#ff7a59",
                            minWidth: "2rem",
                          }}
                        >
                          <span className="text-xs font-medium text-white">
                            {o.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contacts Table */}
      {contactsForTable.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "#2a2a3a" }}>
            <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
              Contacts
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              Showing first 50 of {total.toLocaleString()} contacts
            </p>
          </div>
          <ContactsTable contacts={contactsForTable} />
        </div>
      )}
    </div>
  );
}
