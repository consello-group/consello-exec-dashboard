import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// --- Helpers ---

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function cuid(): string {
  return (
    "c" +
    Math.random().toString(36).slice(2, 12) +
    Date.now().toString(36)
  );
}

// --- User data ---

const FIRST_NAMES = [
  "James", "Emma", "Oliver", "Sophia", "William", "Ava", "Benjamin", "Isabella",
  "Elijah", "Mia", "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper",
  "Alexander", "Evelyn", "Ethan", "Abigail", "Daniel", "Emily", "Henry", "Elizabeth",
  "Jackson", "Avery", "Sebastian", "Sofia", "Aiden", "Ella", "Matthew", "Madison",
  "Samuel", "Scarlett", "David", "Victoria", "Joseph", "Aria", "Carter", "Grace",
  "Owen", "Chloe", "Wyatt", "Penelope", "John", "Layla", "Jack", "Riley",
  "Luke", "Zoey", "Jayden", "Nora", "Dylan", "Lily", "Grayson", "Eleanor",
  "Levi", "Hannah", "Isaac", "Lillian", "Gabriel", "Addison", "Julian", "Aubrey",
  "Mateo", "Ellie", "Anthony", "Stella", "Jaxon", "Natalie", "Lincoln", "Zoe",
  "Joshua", "Leah", "Christopher", "Hazel", "Andrew", "Violet", "Theodore", "Aurora",
  "Caleb", "Savannah", "Ryan", "Audrey", "Nathan", "Brooklyn", "Aaron", "Bella",
  "Isaiah", "Claire", "Thomas", "Skylar", "Charles", "Lucy", "Josiah", "Paisley",
  "Hudson", "Everly", "Christian", "Anna", "Connor", "Nova",
  "Eli", "Genesis", "Ezra", "Emilia", "Adrian", "Kennedy",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
  "Mitchell", "Carter", "Roberts", "Patel", "Chen", "Kim", "Singh", "Sharma",
  "Murphy", "Walsh", "Ryan", "Burke", "Collins", "Kennedy", "Sullivan",
];

const DEPARTMENTS = [
  "Advisory", "Advisory", "Advisory",
  "Investment Banking", "Investment Banking",
  "Talent Recruiting",
  "Operations",
  "Technology",
  "Finance",
  "Legal",
];

const COST_TIERS: Array<"senior" | "mid" | "junior"> = [
  "senior", "senior", "senior",
  "mid", "mid", "mid", "mid", "mid",
  "junior", "junior",
];

const CHATGPT_MODELS = [
  { model: "gpt-4o", weight: 60 },
  { model: "gpt-4o-mini", weight: 30 },
  { model: "gpt-4-turbo", weight: 10 },
];

const CLAUDE_MODELS = [
  { model: "claude-3-5-sonnet-20241022", weight: 70 },
  { model: "claude-3-opus-20240229", weight: 20 },
  { model: "claude-3-haiku-20240307", weight: 10 },
];

function weightedPick(models: { model: string; weight: number }[]): string {
  const total = models.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of models) {
    r -= m.weight;
    if (r <= 0) return m.model;
  }
  return models[models.length - 1].model;
}

// --- Main ---

async function main() {
  console.log("=== AI Usage Demo Seed ===\n");

  // Cleanup
  console.log("Cleaning up existing data...");
  await db.costRecord.deleteMany();
  await db.usageRecord.deleteMany();
  await db.user.deleteMany();
  await db.syncLog.deleteMany();
  await db.productivityConfig.deleteMany();
  console.log("  Existing data cleared.\n");

  // Users
  console.log("Creating 103 users...");
  const usedNames = new Set<string>();
  const users: Array<{
    id: string;
    email: string;
    name: string;
    department: string;
    costTier: string;
    chatgptUserId: string | null;
    claudeUserId: string | null;
    userTier: "power" | "moderate" | "light";
  }> = [];

  for (let i = 0; i < 103; i++) {
    let firstName: string, lastName: string, fullName: string;
    do {
      firstName = pick(FIRST_NAMES);
      lastName = pick(LAST_NAMES);
      fullName = firstName + " " + lastName;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const slug = firstName.toLowerCase() + "." + lastName.toLowerCase();
    const department = pick(DEPARTMENTS);
    const costTier = pick(COST_TIERS);

    // 60% ChatGPT active, 40% Claude active
    const hasChatgpt = Math.random() < 0.6;
    const hasClaude = Math.random() < 0.4;

    // Tier: first 15 = power, next 40 = moderate, rest = light
    let userTier: "power" | "moderate" | "light";
    if (i < 15) userTier = "power";
    else if (i < 55) userTier = "moderate";
    else userTier = "light";

    users.push({
      id: cuid(),
      email: slug + "@consello.com",
      name: fullName,
      department,
      costTier,
      chatgptUserId: hasChatgpt ? "chatgpt-user-" + (i + 1) : null,
      claudeUserId: hasClaude ? "claude-user-" + (i + 1) : null,
      userTier,
    });
  }

  await db.user.createMany({
    data: users.map(({ userTier: _tier, ...u }) => u),
    skipDuplicates: true,
  });
  console.log("  Created " + users.length + " users.\n");

  // Usage & Cost Records
  console.log("Generating 90 days of usage data...");

  const usageRecords: Array<{
    id: string;
    userId: string;
    platform: string;
    model: string;
    date: Date;
    inputTokens: bigint;
    outputTokens: bigint;
    totalTokens: bigint;
    requests: number;
  }> = [];

  const costRecords: Array<{
    id: string;
    userId: string;
    platform: string;
    date: Date;
    amount: number;
    category: string | null;
  }> = [];

  for (const user of users) {
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const date = daysAgo(89 - dayOffset);

      // ChatGPT usage
      if (user.chatgptUserId) {
        let tokens = 0;
        let skip = false;

        if (user.userTier === "power") {
          tokens = rand(50_000, 200_000);
        } else if (user.userTier === "moderate") {
          tokens = rand(5_000, 30_000);
        } else {
          if (Math.random() < 0.5) { skip = true; }
          else tokens = rand(500, 5_000);
        }

        if (!skip && tokens > 0) {
          const inputTokens = BigInt(Math.floor(tokens * 0.6));
          const outputTokens = BigInt(Math.floor(tokens * 0.4));
          const totalTokens = inputTokens + outputTokens;
          const requests = Math.max(1, Math.round(tokens / 2000));
          const model = weightedPick(CHATGPT_MODELS);

          usageRecords.push({
            id: cuid(),
            userId: user.id,
            platform: "chatgpt",
            model,
            date,
            inputTokens,
            outputTokens,
            totalTokens,
            requests,
          });

          costRecords.push({
            id: cuid(),
            userId: user.id,
            platform: "chatgpt",
            date,
            amount: (Number(totalTokens) / 1000) * 0.005,
            category: "tokens",
          });
        }
      }

      // Claude usage
      if (user.claudeUserId) {
        let tokens = 0;
        let skip = false;

        if (user.userTier === "power") {
          tokens = rand(40_000, 180_000);
        } else if (user.userTier === "moderate") {
          tokens = rand(4_000, 25_000);
        } else {
          if (Math.random() < 0.5) { skip = true; }
          else tokens = rand(400, 4_500);
        }

        if (!skip && tokens > 0) {
          const inputTokens = BigInt(Math.floor(tokens * 0.6));
          const outputTokens = BigInt(Math.floor(tokens * 0.4));
          const totalTokens = inputTokens + outputTokens;
          const requests = Math.max(1, Math.round(tokens / 2000));
          const model = weightedPick(CLAUDE_MODELS);

          usageRecords.push({
            id: cuid(),
            userId: user.id,
            platform: "claude",
            model,
            date,
            inputTokens,
            outputTokens,
            totalTokens,
            requests,
          });

          costRecords.push({
            id: cuid(),
            userId: user.id,
            platform: "claude",
            date,
            amount: (Number(totalTokens) / 1000) * 0.008,
            category: "tokens",
          });
        }
      }
    }
  }

  console.log(
    "  Generated " + usageRecords.length + " usage records and " + costRecords.length + " cost records."
  );

  const CHUNK = 500;
  console.log("  Inserting usage records (chunked)...");
  for (let i = 0; i < usageRecords.length; i += CHUNK) {
    await db.usageRecord.createMany({
      data: usageRecords.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    if ((i / CHUNK) % 20 === 0) {
      console.log("    ... " + Math.min(i + CHUNK, usageRecords.length) + " / " + usageRecords.length);
    }
  }
  console.log("  Usage records inserted.");

  console.log("  Inserting cost records (chunked)...");
  for (let i = 0; i < costRecords.length; i += CHUNK) {
    await db.costRecord.createMany({
      data: costRecords.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    if ((i / CHUNK) % 20 === 0) {
      console.log("    ... " + Math.min(i + CHUNK, costRecords.length) + " / " + costRecords.length);
    }
  }
  console.log("  Cost records inserted.\n");

  // ProductivityConfig
  console.log("Seeding ProductivityConfig defaults...");
  const configs = [
    {
      key: "minutes_saved_simple",
      value: "5",
      label: "Minutes Saved (Simple)",
      description: "Time saved per simple conversation (<2K tokens)",
    },
    {
      key: "minutes_saved_moderate",
      value: "15",
      label: "Minutes Saved (Moderate)",
      description: "Time saved per moderate conversation (2K-10K tokens)",
    },
    {
      key: "minutes_saved_complex",
      value: "45",
      label: "Minutes Saved (Complex)",
      description: "Time saved per complex conversation (>10K tokens)",
    },
    {
      key: "hourly_rate",
      value: "150",
      label: "Hourly Rate ($)",
      description: "Average fully-loaded hourly cost per employee",
    },
  ];

  for (const config of configs) {
    await db.productivityConfig.upsert({
      where: { key: config.key },
      update: config,
      create: { id: cuid(), ...config },
    });
  }
  console.log("  Created " + configs.length + " ProductivityConfig entries.\n");

  // SyncLog
  console.log("Inserting SyncLog entries...");
  await db.syncLog.createMany({
    data: [
      {
        id: cuid(),
        platform: "chatgpt",
        status: "success",
        message: "Demo seed -- 90 days of usage data loaded",
        recordCount: usageRecords.filter((r) => r.platform === "chatgpt").length,
        syncedAt: new Date(),
      },
      {
        id: cuid(),
        platform: "claude",
        status: "success",
        message: "Demo seed -- 90 days of usage data loaded",
        recordCount: usageRecords.filter((r) => r.platform === "claude").length,
        syncedAt: new Date(),
      },
    ],
  });
  console.log("  SyncLog entries created.\n");

  // Summary
  const totalCost = costRecords.reduce((s, r) => s + r.amount, 0);
  const chatgptCost = costRecords
    .filter((r) => r.platform === "chatgpt")
    .reduce((s, r) => s + r.amount, 0);
  const claudeCost = costRecords
    .filter((r) => r.platform === "claude")
    .reduce((s, r) => s + r.amount, 0);

  console.log("=== Seed Complete ===");
  console.log("  Users:           " + users.length);
  console.log("  Usage records:   " + usageRecords.length);
  console.log("  Cost records:    " + costRecords.length);
  console.log("  Total cost:      $" + totalCost.toFixed(2));
  console.log("    ChatGPT:       $" + chatgptCost.toFixed(2));
  console.log("    Claude:        $" + claudeCost.toFixed(2));
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
