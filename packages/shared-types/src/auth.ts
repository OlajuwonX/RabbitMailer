export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SessionPayload {
  userId: string
  email: string
  name: string
  isAdmin: boolean
  tenantId: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface SignupInput {
  name: string
  email: string
  password: string
}
