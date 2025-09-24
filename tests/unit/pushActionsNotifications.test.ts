import { buildNotificationUrl, hasFallbackChannelEnabled } from "../../convex/lib/notificationHelpers";

describe("pushActions helpers", () => {
  describe("buildNotificationUrl", () => {
    it("includes alert type when no extra data provided", () => {
      const url = buildNotificationUrl("interrupt", {});
      expect(url).toBe("/modern?alert=interrupt");
    });

    it("adds project and timer identifiers when available", () => {
      const url = buildNotificationUrl("interrupt", { projectId: "proj_123", timerId: "timer_456" });
      const parsed = new URL(`https://example.com${url}`);
      expect(parsed.pathname).toBe("/modern");
      expect(parsed.searchParams.get("alert")).toBe("interrupt");
      expect(parsed.searchParams.get("project")).toBe("proj_123");
      expect(parsed.searchParams.get("timer")).toBe("timer_456");
    });
  });

  describe("hasFallbackChannelEnabled", () => {
    it("returns true when any fallback channel is active with contact info", () => {
      expect(
        hasFallbackChannelEnabled({
          emailEnabled: true,
          fallbackEmail: "alerts@example.com",
          smsEnabled: false,
          slackEnabled: false,
        }),
      ).toBe(true);

      expect(
        hasFallbackChannelEnabled({
          emailEnabled: false,
          fallbackEmail: null,
          smsEnabled: true,
          smsNumber: "+15551234567",
          slackEnabled: false,
        }),
      ).toBe(true);

      expect(
        hasFallbackChannelEnabled({
          emailEnabled: false,
          smsEnabled: false,
          slackEnabled: true,
          slackWebhookUrl: "https://hooks.slack.com/service/foo",
        }),
      ).toBe(true);
    });

    it("returns false when channels are toggled off or missing contact details", () => {
      expect(
        hasFallbackChannelEnabled({
          emailEnabled: false,
          smsEnabled: false,
          slackEnabled: false,
        }),
      ).toBe(false);

      expect(
        hasFallbackChannelEnabled({
          emailEnabled: true,
          fallbackEmail: "",
          smsEnabled: false,
          slackEnabled: false,
        }),
      ).toBe(false);
    });
  });
});
