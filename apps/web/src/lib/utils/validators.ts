const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase());
}

export function parseEmailList(input: string): {
  valid: string[];
  invalid: string[];
} {
  const items = input
    .split(/[\n,]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(items)];

  return {
    valid: unique.filter(isValidEmail),
    invalid: unique.filter((email) => !isValidEmail(email)),
  };
}

export function parseCsvTemplates(csv: string): {
  subject: string;
  body: string;
}[] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      if (comma === -1) return null;
      const subject = line.slice(0, comma).trim();
      const body = line.slice(comma + 1).trim();
      return subject && body ? { subject, body } : null;
    })
    .filter((row): row is { subject: string; body: string } => row !== null);
}

export function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatPercentage(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
