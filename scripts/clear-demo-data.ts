/**
 * clear-demo-data.ts
 *
 * Wipes all seeded demo data so the dashboard can be loaded with real data:
 *   - Run: npm run clear:demo
 *
 * After running:
 *   1. Settings → Sync HubSpot   (real CRM data)
 *   2. Settings → ChatGPT CSV Import → upload monthly CSV files
 *   3. Settings → Sync Claude    (real Anthropic usage data)
 *
 * Tables preserved: ProductivityConfig, ClaudeAnalyticsSummary, ClaudeUserActivity
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("⚠️  Clearing all demo data from the database...\n");

  // ── Phase 1: AI usage data ─────────────────────────────────────────────────
  // UsageRecord and CostRecord must be deleted before User (no cascade delete)

  const usage = await db.usageRecord.deleteMany({});
  console.log(`  ✓ UsageRecord   — deleted ${usage.count} rows`);

  const costs = await db.costRecord.deleteMany({});
  console.log(`  ✓ CostRecord    — deleted ${costs.count} rows`);

  const users = await db.user.deleteMany({});
  console.log(`  ✓ User          — deleted ${users.count} rows`);

  const logs = await db.syncLog.deleteMany({});
  console.log(`  ✓ SyncLog       — deleted ${logs.count} rows`);

  // ── Phase 2: HubSpot CRM data ─────────────────────────────────────────────
  // No FK constraints between HubSpot tables — any order is safe

  const engagements = await db.hubSpotEngagement.deleteMany({});
  console.log(`  ✓ HubSpotEngagement    — deleted ${engagements.count} rows`);

  const contacts = await db.hubSpotContact.deleteMany({});
  console.log(`  ✓ HubSpotContact       — deleted ${contacts.count} rows`);

  const deals = await db.hubSpotDeal.deleteMany({});
  console.log(`  ✓ HubSpotDeal          — deleted ${deals.count} rows`);

  const companies = await db.hubSpotCompany.deleteMany({});
  console.log(`  ✓ HubSpotCompany       — deleted ${companies.count} rows`);

  const owners = await db.hubSpotOwner.deleteMany({});
  console.log(`  ✓ HubSpotOwner         — deleted ${owners.count} rows`);

  const stages = await db.hubSpotPipelineStage.deleteMany({});
  console.log(`  ✓ HubSpotPipelineStage — deleted ${stages.count} rows`);

  console.log("\n✅ Demo data cleared. Next steps:");
  console.log("   1. Open /settings → Sync HubSpot");
  console.log("   2. Open /settings → ChatGPT CSV Import → upload monthly CSV files");
  console.log("   3. Open /settings → Sync Claude");
}

main()
  .catch((err) => {
    console.error("❌ Error clearing demo data:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
