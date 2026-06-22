export interface Template {
  id: string
  userId: string
  name: string
  subject: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTemplateInput {
  name: string
  subject: string
  body: string
}
