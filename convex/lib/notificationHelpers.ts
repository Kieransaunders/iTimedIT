export function buildNotificationUrl(alertType: string, data: any): string {
  const params = new URLSearchParams({ alert: alertType });
  if (data?.projectId) {
    params.set("project", data.projectId);
  }
  if (data?.timerId) {
    params.set("timer", data.timerId);
  }
  
  // Prefer absolute URL when SITE_URL configured; otherwise fall back to relative path
  const baseUrl = process.env.SITE_URL?.replace(/\/$/, "");
  if (baseUrl) {
    return `${baseUrl}/modern?${params.toString()}`;
  }

  return `/modern?${params.toString()}`;
}

export function hasFallbackChannelEnabled(prefs: any): boolean {
  if (!prefs) return false;
  return (
    (prefs.emailEnabled && !!prefs.fallbackEmail) ||
    (prefs.smsEnabled && !!prefs.smsNumber) ||
    (prefs.slackEnabled && !!prefs.slackWebhookUrl)
  );
}
