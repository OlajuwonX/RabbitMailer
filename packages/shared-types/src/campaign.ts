export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "paused"
  | "completed"
  | "failed";

export type RotationStrategy = "sequential" | "random";

export type RecipientStatus =
  | "pending"
  | "sent"
  | "opened"
  | "clicked"
  | "bounced"
  | "unsubscribed";

export type EngagementType =
  | "open"
  | "click"
  | "bounce"
  | "spam"
  | "unsubscribe";

export interface Campaign {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  status: CampaignStatus;
  rotationStrategy: RotationStrategy;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  spamCount: number;
  unsubscribeCount: number;
  scheduledFor: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recipient {
  id: string;
  tenantId: string;
  campaignId: string;
  email: string;
  name: string | null;
  templateId: string | null;
  status: RecipientStatus;
  sentAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  createdAt: Date;
}

export interface Engagement {
  id: string;
  tenantId: string;
  recipientId: string;
  campaignId: string;
  type: EngagementType;
  url: string | null;
  ip: string | null;
  userAgent: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface CreateCampaignInput {
  name: string;
  templateIds: string[];
  recipientEmails: string[];
  rotationStrategy: RotationStrategy;
  scheduledFor?: Date;
}

export interface UpdateCampaignInput {
  name?: string;
  scheduledFor?: Date | null;
}

export interface QueueCounts {
  pending: number;
  sent: number;
  failed: number;
  total: number;
  estimatedCompletionAt: Date | null;
}

export interface EmailJob {
  tenantId: string;
  recipientId: string;
  campaignId: string;
  templateId: string;
}
