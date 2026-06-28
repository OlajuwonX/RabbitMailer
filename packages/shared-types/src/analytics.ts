export interface AnalyticsSummary {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface DailyStat {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
  bounces: number;
}

export interface TopSubject {
  subject: string;
  templateId: string;
  sent: number;
  openRate: number;
  clickRate: number;
}
