export type Platform = "chatgpt" | "claude" | "hubspot";

export interface OverviewMetrics {
  totalTokens: bigint;
  totalRequests: number;
  totalCost: number;
  activeUsers: number;
  chatgptTokens: bigint;
  claudeTokens: bigint;
  chatgptCost: number;
  claudeCost: number;
  chatgptUsers: number;
  claudeUsers: number;
}

/** Token counts are numbers (not bigint) for charting compatibility */
export interface UsageDataPoint {
  date: string;
  chatgpt: number;
  claude: number;
  total: number;
}

export interface CostDataPoint {
  date: string;
  chatgpt: number;
  claude: number;
  total: number;
}

export interface UserUsage {
  userId: string;
  email: string;
  name: string | null;
  chatgptTokens: number;
  claudeTokens: number;
  totalTokens: number;
  chatgptCost: number;
  claudeCost: number;
  totalCost: number;
  chatgptRequests: number;
  claudeRequests: number;
}

export interface ModelDistribution {
  model: string;
  platform: string;
  tokens: number;
  percentage: number;
}

export interface SyncStatus {
  platform: string;
  lastSync: string | null;
  status: string;
  recordCount: number | null;
}

export interface ProductivityMetrics {
  hoursSaved: number;
  dollarValue: number;
  roiRatio: number;
  costPerProductiveHour: number;
  totalConversations: number;
  activeUsers: number;
}

export interface ProductivityUser {
  userId: string;
  email: string;
  name: string | null;
  conversations: number;
  hoursSaved: number;
  dollarValue: number;
  tier: "power" | "moderate" | "light" | "non-user";
}

export interface AdoptionTier {
  tier: string;
  count: number;
  percentage: number;
}
