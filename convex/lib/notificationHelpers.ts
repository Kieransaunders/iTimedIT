export function buildNotificationUrl(alertType: string, data: any): string {
  const params = new URLSearchParams({ alert: alertType });
  if (data?.projectId) {
    params.set("project", data.projectId);
  }
  if (data?.timerId) {
    params.set("timer", data.timerId);
  }
  
  // Use absolute URL for better compatibility with macOS system notifications
  const baseUrl = process.env.SITE_URL || 'http://localhost:5173';
  return `${baseUrl}/modern?${params.toString()}`;
}

export function hasFallbackChannelEnabled(prefs: any): boolean {
  if (!prefs) return false;
  return (
    (prefs.emailEnabled && !!prefs.fallbackEmail) ||
    (prefs.smsEnabled && !!prefs.smsNumber) ||
    (prefs.slackEnabled && !!prefs.slackWebhookUrl)
  );
}
