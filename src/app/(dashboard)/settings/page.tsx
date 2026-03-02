export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { SyncButton } from "@/components/settings/sync-button";
import { ChatGPTCsvUpload } from "@/components/settings/csv-upload";
import { manualSyncClaude, manualSyncChatGPT, manualSyncHubSpot, manualSyncClaudeAnalytics } from "./actions";

// ─── Status indicator dot ─────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: active ? "#10a37f" : "#ef4444" }}
      title={active ? "Connected" : "Not configured"}
    />
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold" style={{ color: "#f1f5f9" }}>
        {title}
      </h2>
      {sub && (
        <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  // Fetch sync logs and config
  const [syncLogs, configRecords] = await Promise.all([
    db.syncLog.findMany({
      orderBy: { syncedAt: "desc" },
      distinct: ["platform"],
      where: { status: "success" },
    }),
    db.productivityConfig.findMany({ orderBy: { key: "asc" } }),
  ]);

  // Also get the most recent log per platform regardless of status
  const allLatestLogs = await db.syncLog.findMany({
    orderBy: { syncedAt: "desc" },
    distinct: ["platform"],
  });

  const syncMap = new Map(syncLogs.map((s) => [s.platform, s]));
  const latestMap = new Map(allLatestLogs.map((s) => [s.platform, s]));

  // ── Data source cards config ──────────────────────────────────────────────
  const dataSources = [
    {
      platform: "chatgpt",
      label: "ChatGPT Enterprise",
      envVar: "OPENAI_ADMIN_KEY",
      color: "#10a37f",
      action: manualSyncChatGPT,
      description: "OpenAI Admin API — token usage and costs",
    },
    {
      platform: "claude",
      label: "Claude Enterprise",
      envVar: "ANTHROPIC_ADMIN_KEY",
      color: "#d97706",
      action: manualSyncClaude,
      description: "Anthropic Admin API — token usage and costs",
    },
    {
      platform: "hubspot",
      label: "HubSpot CRM",
      envVar: "HUBSPOT_ACCESS_TOKEN",
      color: "#ff7a59",
      action: manualSyncHubSpot,
      description: "HubSpot CRM API v3 — deals, contacts, companies",
    },
    {
      platform: "claude-analytics",
      label: "Claude Analytics",
      envVar: "ANTHROPIC_ANALYTICS_KEY",
      color: "#d97706",
      action: manualSyncClaudeAnalytics,
      description: "Enterprise Analytics API — per-user engagement, DAU/WAU/MAU",
    },
  ];

  // ── Env var status check ──────────────────────────────────────────────────
  // We check server-side whether the env var is set (non-empty string)
  const envStatus: Record<string, boolean> = {
    OPENAI_ADMIN_KEY: Boolean(process.env.OPENAI_ADMIN_KEY),
    ANTHROPIC_ADMIN_KEY: Boolean(process.env.ANTHROPIC_ADMIN_KEY),
    ANTHROPIC_ANALYTICS_KEY: Boolean(process.env.ANTHROPIC_ANALYTICS_KEY),
    HUBSPOT_ACCESS_TOKEN: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    APP_PASSWORD: Boolean(process.env.APP_PASSWORD),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    AZURE_TENANT_ID: Boolean(process.env.AZURE_TENANT_ID),
    AZURE_CLIENT_ID: Boolean(process.env.AZURE_CLIENT_ID),
    AZURE_CLIENT_SECRET: Boolean(process.env.AZURE_CLIENT_SECRET),
    IBOSS_API_URL: Boolean(process.env.IBOSS_API_URL),
  };

  function formatSyncTime(d: Date | null): string {
    if (!d) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  return (
    <div className="p-6 space-y-8" style={{ backgroundColor: "#0a0a0f", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
          Settings &amp; Configuration
        </h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Manage data source connections, sync schedules, and productivity configuration
        </p>
      </div>

      {/* Section 1: Data Sources */}
      <section>
        <SectionHeader
          title="Data Sources"
          sub="Sync status and manual controls for each data integration"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dataSources.map((source) => {
            const successLog = syncMap.get(source.platform);
            const latestLog = latestMap.get(source.platform);
            const isConfigured = envStatus[source.envVar] ?? false;
            const lastSyncTime = successLog?.syncedAt ?? null;
            const latestStatus = latestLog?.status ?? null;
            const recordCount = successLog?.recordCount ?? null;

            return (
              <div
                key={source.platform}
                className="rounded-xl border p-5 space-y-4"
                style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusDot active={isConfigured} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>
                        {source.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                        {source.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className="flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: isConfigured ? "#052e16" : "#450a0a",
                      color: isConfigured ? "#10a37f" : "#ef4444",
                    }}
                  >
                    {isConfigured ? "Connected" : "Not configured"}
                  </span>
                </div>

                {/* Sync info */}
                <div
                  className="rounded-lg p-3 space-y-1.5"
                  style={{ backgroundColor: "#0a0a0f", border: "1px solid #1e1e2e" }}
                >
                  <div className="flex justify-between text-xs">
                    <span style={{ color: "#94a3b8" }}>Last sync</span>
                    <span style={{ color: "#f1f5f9" }}>
                      {formatSyncTime(lastSyncTime)}
                    </span>
                  </div>
                  {latestStatus && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "#94a3b8" }}>Status</span>
                      <span
                        style={{
                          color: latestStatus === "success" ? "#10a37f" : "#ef4444",
                        }}
                      >
                        {latestStatus}
                      </span>
                    </div>
                  )}
                  {recordCount !== null && (
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "#94a3b8" }}>Records</span>
                      <span style={{ color: "#f1f5f9" }}>
                        {recordCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sync button */}
                <SyncButton
                  platform={source.platform}
                  label={source.label}
                  action={source.action}
                  disabled={!isConfigured}
                  accentColor={source.color}
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
          className="rounded-xl border p-5"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
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
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
        >
          {configRecords.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "#94a3b8" }}>
              No productivity config found. Run a database seed to add default values.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                  {["Key", "Label", "Current Value", "Description"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left font-medium"
                      style={{ color: "#94a3b8" }}
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
                      backgroundColor: i % 2 === 0 ? "#12121a" : "#0f0f18",
                      borderBottom: "1px solid #1e1e2e",
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "#94a3b8" }}>
                      {r.key}
                    </td>
                    <td className="px-5 py-3 font-medium" style={{ color: "#f1f5f9" }}>
                      {r.label}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="font-mono font-semibold text-sm"
                        style={{ color: "#10a37f" }}
                      >
                        {r.value}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#94a3b8" }}>
                      {r.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div
            className="px-5 py-3 border-t"
            style={{ borderColor: "#2a2a3a", backgroundColor: "#0a0a0f" }}
          >
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              To update these values, modify the{" "}
              <code
                className="rounded px-1 py-0.5 font-mono text-xs"
                style={{ backgroundColor: "#1a1a26", color: "#f1f5f9" }}
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
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "#12121a", borderColor: "#2a2a3a" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a3a" }}>
                {["Variable", "Status", "Phase", "Description"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left font-medium"
                    style={{ color: "#94a3b8" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  { key: "DATABASE_URL", phase: "Core", desc: "Neon Postgres connection string" },
                  { key: "APP_PASSWORD", phase: "Core", desc: "Shared dashboard password (sessionStorage auth)" },
                  { key: "CRON_SECRET", phase: "Core", desc: "Vercel Cron job authorization" },
                  { key: "OPENAI_ADMIN_KEY", phase: "Phase 1", desc: "OpenAI Admin API key (sk-admin-...)" },
                  { key: "ANTHROPIC_ADMIN_KEY", phase: "Phase 1", desc: "Anthropic Admin API key (sk-ant-admin...)" },
                  { key: "ANTHROPIC_ANALYTICS_KEY", phase: "Phase 1", desc: "Anthropic Analytics API key (claude.ai/analytics/api-keys)" },
                  { key: "HUBSPOT_ACCESS_TOKEN", phase: "Phase 2", desc: "HubSpot Private App access token" },
                  { key: "AZURE_TENANT_ID", phase: "Phase 3", desc: "Azure AD tenant for M365 & Defender" },
                  { key: "AZURE_CLIENT_ID", phase: "Phase 3", desc: "Azure AD app client ID" },
                  { key: "AZURE_CLIENT_SECRET", phase: "Phase 3", desc: "Azure AD app client secret" },
                  { key: "IBOSS_API_URL", phase: "Phase 3", desc: "iBoss API base URL" },
                ] as const
              ).map((row, i) => {
                const configured = envStatus[row.key] ?? false;
                return (
                  <tr
                    key={row.key}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#12121a" : "#0f0f18",
                      borderBottom: "1px solid #1e1e2e",
                    }}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "#f1f5f9" }}>
                      {row.key}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot active={configured} />
                        <span
                          className="text-xs"
                          style={{ color: configured ? "#10a37f" : "#ef4444" }}
                        >
                          {configured ? "Set" : "Not set"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            row.phase === "Core"
                              ? "#1e1b4b"
                              : row.phase === "Phase 1"
                              ? "#052e16"
                              : row.phase === "Phase 2"
                              ? "#431407"
                              : "#1e1a2e",
                          color:
                            row.phase === "Core"
                              ? "#a5b4fc"
                              : row.phase === "Phase 1"
                              ? "#86efac"
                              : row.phase === "Phase 2"
                              ? "#fdba74"
                              : "#c4b5fd",
                        }}
                      >
                        {row.phase}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "#94a3b8" }}>
                      {row.desc}
                    </td>
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
