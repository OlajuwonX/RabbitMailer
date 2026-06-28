export interface Template {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  usageCount: number;
  openCount: number;
  clickCount: number;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  subject: string;
  body: string;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string;
  body?: string;
}

export interface BulkTemplateInput {
  templates: CreateTemplateInput[];
}
