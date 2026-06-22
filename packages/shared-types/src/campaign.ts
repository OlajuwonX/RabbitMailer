export type CampaignStatus = 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'failed'

export interface Campaign {
  id: string
  userId: string
  name: string
  subject: string
  body: string
  recipientCount: number
  sentCount: number
  failedCount: number
  status: CampaignStatus
  scheduledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCampaignInput {
  name: string
  subject: string
  body: string
  recipients: string[]
  templateId?: string
  scheduledAt?: Date
}
