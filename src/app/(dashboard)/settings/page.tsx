export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { SyncButton } from "@/components/settings/sync-button";
import { ChatGPTCsvUpload } from "@/components/settings/csv-upload";
import { manualSyncClaude, manualSyncChatGPT, manualSyncHubSpot, manualSyncClaudeAnalytics } from "./actions";

const TERRACOTTA  = "#A64A30";
const APRICOT     = "#F6D1A3";
const DARK_BORDER = "#2A2A2A";

// ─── Status indicator dot ─────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: active ? "#4ADE80" : "#555555" }}
      title={active ? "Connected" : "Not configured"}
    />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {sub && (
        <p className="text-sm mt-0.5" style={{ color: "#666666" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const [syncLogs, configRecords] = await Promise.all([
    db.syncLog.findMany({
      orderBy: { syncedAt: "desc" },
      distinct: ["platform"],
      where: { status: "success" },
    }),
    db.productivityConfig.findMany({ orderBy: { key: "asc" } }),
  ]);

  const allLatestLogs = await db.syncLog.findMany({
    orderBy: { syncedAt: "desc" },
    distinct: ["platform"],
  });

  const syncMap   = new Map(syncLogs.map((s) => [s.platform, s]));
  const latestMap = new Map(allLatestLogs.map((s) => [s.platform, s]));

  const dataSources = [
    {
      platform: "chatgpt",
      label: "ChatGPT Enterprise",
      envVar: "OPENAI_ADMIN_KEY",
      accentColor: APRICOT,
      action: manualSyncChatGPT,
      description: "OpenAI Admin API — token usage and costs",
    },
    {
      platform: "claude",
      label: "Claude Enterprise",
      envVar: "ANTHROPIC_ADMIN_KEY",
      accentColor: TERRACOTTA,
      action: manualSyncClaude,
      description: "Anthropic Admin API — token usage and costs",
    },
    {
      platform: "hubspot",
      label: "HubSpot CRM",
      envVar: "HUBSPOT_ACCESS_TOKEN",
      accentColor: "#ff7a59",
      action: manualSyncHubSpot,
      description: "HubSpot CRM API v3 — deals, contacts, companies",
    },
    {
      platform: "claude-analytics",
      label: "Claude Analytics",
      envVar: "ANTHROPIC_ANALYTICS_KEY",
      accentColor: TERRACOTTA,
      action: manualSyncClaudeAnalytics,
      description: "Enterprise Analytics API — per-user engagement, DAU/WAU/MAU",
    },
  ];

  const envStatus: Record<string, boolean> = {
    OPENAI_ADMIN_KEY:        Boolean(process.env.OPENAI_ADMIN_KEY),
    ANTHROPIC_ADMIN_KEY:     Boolean(process.env.ANTHROPIC_ADMIN_KEY),
    ANTHROPIC_ANALYTICS_KEY: Boolean(process.env.ANTHROPIC_ANALYTICS_KEY),
    HUBSPOT_ACCESS_TOKEN:    Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
    DATABASE_URL:            Boolean(process.env.DATABASE_URL),
    APP_PASSWORD:            Boolean(process.env.APP_PASSWORD),
    CRON_SECRET:             Boolean(process.env.CRON_SECRET),
    AZURE_TENANT_ID:         Boolean(process.env.AZURE_TENANT_ID),
    AZURE_CLIENT_ID:         Boolean(process.env.AZURE_CLIENT_ID),
    AZURE_CLIENT_SECRET:     Boolean(process.env.AZURE_CLIENT_SECRET),
    IBOSS_API_URL:           Boolean(process.env.IBOSS_API_URL),
  };

  function formatSyncTime(d: Date | null): string {
    if (!d) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(d);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings &amp; Configuration</h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Manage data source connections, sync schedules, and productivity configuration
        </p>
      </div>

      {/* Section 1: Data Sources */}
      <section>
        <SectionHeader
          title="Data Sources"
          sub="Sync status and manual controls for each data integration"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {dataSources.map((source) => {
            const successLog  = syncMap.get(source.platform);
            const latestLog   = latestMap.get(source.platform);
            const isConfigured = envStatus[source.envVar] ?? false;
            const lastSyncTime = successLog?.syncedAt ?? null;
            const latestStatus = latestLog?.status ?? null;
            const recordCount  = successLog?.recordCount ?? null;

            return (
              <div
                key={source.platform}
                className="rounded-xl p-5 space-y-4 relative overflow-hidden"
                style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
              >
                {/* top accent bar */}
                <span
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: source.accentColor, opacity: 0.7 }}
                />

                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot active={isConfigured} />
                    <div>
                      <p className="font-semibold text-sm text-white">{source.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#666666" }}>
                        {source.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className="flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: isConfigured ? "rgba(74,222,128,0.1)" : "rgba(85,85,85,0.2)",
                      color: isConfigured ? "#4ADE80" : "#555555",
                      border: `1px solid ${isConfigured ? "rgba(74,222,128,0.3)" : "rgba(85,85,85,0.4)"}`,
                    }}
                  >
                    {isConfigured ? "Connected" : "Not set"}
                  </span>
                </div>

                {/* Sync info */}
                <div
                  className="rounded-lg p-3 space-y-1.5"
                  style={{ backgroundColor: "#0A0A0A", border: `1px solid ${DARK_BORDER}` }}
                >
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#666666" }}>Last sync</span>
                    <span className="text-white">{formatSyncTime(lastSyncTime)}</span>
                  </div>
                  {latestStatus && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "#666666" }}>Status</span>
                      <span style={{ color: latestStatus === "success" ? "#4ADE80" : "#ef4444" }}>
                        {latestStatus}
                      </span>
                    </div>
                  )}
                  {recordCount !== null && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "#666666" }}>Records</span>
                      <span className="text-white">{recordCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Sync button */}
                <SyncButton
                  platform={source.platform}
                  label={source.label}
                  action={source.action}
                  disabled={!isConfigured}
                  accentColor={source.accentColor}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: ChatGPT CSV Import */}
      <section>
        <SectionHeader
          title="ChatGPT CSV Import"
          sub="Upload monthly user report exports from the OpenAI admin portal — covers message counts and model breakdown per user"
        />
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <ChatGPTCsvUpload />
        </div>
      </section>

      {/* Section 3: Productivity Configuration */}
      <section>
        <SectionHeader
          title="Productivity Configuration"
          sub="Multipliers and rates used to calculate AI productivity estimates"
        />
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          {configRecords.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "#666666" }}>
              No productivity config found. Run a database seed to add default values.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                  {["Key", "Label", "Current Value", "Description"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-semibold uppercase tracking-widest"
                      style={{ color: "#666666", fontSize: 11 }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configRecords.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: `1px solid ${i < configRecords.length - 1 ? "#1A1A1A" : "transparent"}`,
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "#666666" }}>{r.key}</td>
                    <td className="px-5 py-3 font-medium text-white">{r.label}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-semibold" style={{ color: APRICOT }}>{r.value}</span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#666666" }}>{r.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${DARK_BORDER}` }}>
            <p className="text-xs" style={{ color: "#555555" }}>
              To update these values, modify the{" "}
              <code
                className="rounded px-1 py-0.5 font-mono text-xs"
                style={{ backgroundColor: "#1A1A1A", color: "#999999" }}
              >
                productivity_config
              </code>{" "}
              table directly or via a future admin UI.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: API Configuration Status */}
      <section>
        <SectionHeader
          title="API Configuration Status"
          sub="Environment variables required for each integration phase"
        />
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#111111", border: `1px solid ${DARK_BORDER}` }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                {["Variable", "Status", "Phase", "Description"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left font-semibold uppercase tracking-widest"
                    style={{ color: "#666666", fontSize: 11 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { key: "DATABASE_URL",            phase: "Core",    desc: "Neon Postgres connection string" },
                  { key: "APP_PASSWORD",             phase: "Core",    desc: "Shared dashboard password (sessionStorage auth)" },
                  { key: "CRON_SECRET",              phase: "Core",    desc: "Vercel Cron job authorization" },
                  { key: "OPENAI_ADMIN_KEY",         phase: "Phase 1", desc: "OpenAI Admin API key (sk-admin-...)" },
                  { key: "ANTHROPIC_ADMIN_KEY",      phase: "Phase 1", desc: "Anthropic Admin API key (sk-ant-admin...)" },
                  { key: "ANTHROPIC_ANALYTICS_KEY",  phase: "Phase 1", desc: "Anthropic Analytics API key" },
                  { key: "HUBSPOT_ACCESS_TOKEN",     phase: "Phase 2", desc: "HubSpot Private App access token" },
                  { key: "AZURE_TENANT_ID",          phase: "Phase 3", desc: "Azure AD tenant for M365 & Defender" },
                  { key: "AZURE_CLIENT_ID",          phase: "Phase 3", desc: "Azure AD app client ID" },
                  { key: "AZURE_CLIENT_SECRET",      phase: "Phase 3", desc: "Azure AD app client secret" },
                  { key: "IBOSS_API_URL",            phase: "Phase 3", desc: "iBoss API base URL" },
                ] as const
              ).map((row, i) => {
                const configured = envStatus[row.key] ?? false;
                const phaseColor: Record<string, { bg: string; text: string }> = {
                  "Core":    { bg: "rgba(166,74,48,0.15)",   text: TERRACOTTA },
                  "Phase 1": { bg: "rgba(246,209,163,0.15)", text: APRICOT },
                  "Phase 2": { bg: "rgba(74,222,128,0.1)",   text: "#4ADE80" },
                  "Phase 3": { bg: "rgba(100,100,100,0.15)", text: "#888888" },
                };
                const pc = phaseColor[row.phase] ?? phaseColor["Phase 3"];
                return (
                  <tr
                    key={row.key}
                    style={{
                      borderBottom: `1px solid ${i < 10 ? "#1A1A1A" : "transparent"}`,
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-white">{row.key}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot active={configured} />
                        <span className="text-xs" style={{ color: configured ? "#4ADE80" : "#555555" }}>
                          {configured ? "Set" : "Not set"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: pc.bg, color: pc.text, border: `1px solid ${pc.text}33` }}
                      >
                        {row.phase}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#666666" }}>{row.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
