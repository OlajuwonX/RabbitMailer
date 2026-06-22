export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface Session {
  userId: string
  email: string
  expiresAt: Date
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
