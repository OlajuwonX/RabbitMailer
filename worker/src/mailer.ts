import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getScopedPrisma } from "./db.js";
import { decrypt } from "./crypto.js";

export interface MailTransport {
  transporter: Transporter;
  /* Pre-formatted sender: `"Name" <email@domain.com>` */
  fromAddress: string;
  /* SMTP hostname — used to build the Message-ID header: `<{timestamp}.{recipientId}@{host}>` */
  host: string;
}

/* Builds a Nodemailer transporter from the tenant's live SmtpConfig record. No singleton — a fresh transporter is created per job so that SMTP config changes in Settings take effect on the very next email without a worker restart. At 30 emails/hour the overhead is negligible. */
export async function createTransporterForTenant(
  tenantId: string,
): Promise<MailTransport> {
  const prisma = getScopedPrisma(tenantId);

  // SmtpConfig has @@unique([tenantId]), so findFirst returns the one record for this tenant. The $extends scope adds tenantId to the where clause automatically, so no explicit filter is needed.
  const config = await prisma.smtpConfig.findFirst({ where: {} });

  if (!config) {
    // Throw so pg-boss marks this job as failed and retries it. The tenant admin must configure SMTP via Settings before jobs can succeed.
    throw new Error(
      "No SMTP configuration found for this tenant. Configure SMTP in Settings.",
    );
  }

  const password = decrypt(config.password);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // Port 465 uses implicit TLS (SMTPS); all other ports use STARTTLS.
    secure: config.port === 465,
    auth: {
      user: config.username,
      pass: password,
    },
    // Pool keeps the SMTP connection alive for the duration of this job so retries within the same job don't open a new TCP connection each time.
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return {
    transporter,
    fromAddress: `"${config.fromName}" <${config.fromEmail}>`,
    host: config.host,
  };
}
