export interface HubSpotDealRecord {
  id: string;
  name: string;
  stage: string;
  stageLabel: string | null;
  pipeline: string;
  pipelineLabel: string | null;
  amount: number | null;
  closeDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
  lastModified: string;
  daysInStage: number | null;
}

export interface HubSpotCompanyRecord {
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
  healthBucket: "active" | "cooling" | "cold" | "at-risk";
}

export interface HubSpotContactRecord {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  lifecycleStage: string | null;
  ownerId: string | null;
  createdAt: string;
  lastModified: string;
}

export interface HubSpotOwnerRecord {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  teamName: string | null;
}

export interface HubSpotEngagementRecord {
  id: string;
  type: string;
  ownerId: string | null;
  ownerName: string | null;
  companyId: string | null;
  contactId: string | null;
  dealId: string | null;
  occurredAt: string;
}

export interface PipelineStageData {
  stageId: string;
  stageLabel: string;
  displayOrder: number;
  probability: number;
  dealCount: number;
  totalAmount: number;
  weightedAmount: number;
}

export interface PipelineData {
  pipelineId: string;
  pipelineLabel: string;
  stages: PipelineStageData[];
}

export interface PipelineMetrics {
  pipelines: PipelineData[];
  totalPipelineValue: number;
  weightedForecast: number;
  openDeals: number;
  avgDealSize: number;
  staleDeals: number;
}

export interface RelationshipMetrics {
  activeCompanies: number;
  atRiskCompanies: number;
  avgDaysBetweenContacts: number;
  engagementsThisWeek: number;
  healthBuckets: {
    active: number;
    cooling: number;
    cold: number;
    atRisk: number;
  };
}

export interface CRMHealthMetrics {
  totalContacts: number;
  dataQualityScore: number;
  unassignedContacts: number;
  newThisMonth: number;
  completeness: {
    withEmail: number;
    withPhone: number;
    withCompany: number;
    withJobTitle: number;
    withOwner: number;
  };
}

export interface CRMActivityMetrics {
  totalActivitiesThisWeek: number;
  activeCRMUsers: number;
  inactiveUsers: number;
  mostActiveUser: string | null;
}
