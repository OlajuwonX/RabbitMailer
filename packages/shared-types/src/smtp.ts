export interface SmtpConfigPublic {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  updatedAt: Date;
}

export interface SaveSmtpConfigInput {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  password?: string;
}
