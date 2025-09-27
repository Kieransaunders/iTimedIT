import { describe, expect, it } from "@jest/globals";
import {
  buildInviteLandingUrl,
  extractInvitePathDetails,
  prefersHtmlInviteResponse,
} from "../../convex/invitationsHttp";

describe("prefersHtmlInviteResponse", () => {
  it("returns true when the client prefers HTML", () => {
    const acceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    expect(prefersHtmlInviteResponse(acceptHeader)).toBe(true);
  });

  it("returns false when JSON is explicitly requested", () => {
    const acceptHeader = "application/json";
    expect(prefersHtmlInviteResponse(acceptHeader)).toBe(false);
  });

  it("returns false when both JSON and HTML are acceptable", () => {
    const acceptHeader = "application/json,text/html";
    expect(prefersHtmlInviteResponse(acceptHeader)).toBe(false);
  });

  it("returns false when no accept header is provided", () => {
    expect(prefersHtmlInviteResponse(null)).toBe(false);
  });
});

describe("extractInvitePathDetails", () => {
  it("detects root invite paths", () => {
    const url = new URL("https://example.com/invite/token123");
    expect(extractInvitePathDetails(url)).toEqual({ basePath: "/", tokenFromPath: "token123" });
  });

  it("preserves nested base paths", () => {
    const url = new URL("https://example.com/app/invite/token456");
    expect(extractInvitePathDetails(url)).toEqual({ basePath: "/app/", tokenFromPath: "token456" });
  });

  it("handles multi-level paths", () => {
    const url = new URL("https://example.com/app/portal/invite/token789");
    expect(extractInvitePathDetails(url)).toEqual({ basePath: "/app/portal/", tokenFromPath: "token789" });
  });

  it("returns null token when the path lacks an invite token", () => {
    const url = new URL("https://example.com/invite");
    expect(extractInvitePathDetails(url)).toEqual({ basePath: "/", tokenFromPath: null });
  });
});

describe("buildInviteLandingUrl", () => {
  it("redirects to the root path with the token", () => {
    const url = new URL("https://example.com/invite/abc");
    const redirect = buildInviteLandingUrl(url, "/", "abc");
    expect(redirect.pathname).toBe("/");
    expect(redirect.search).toBe("?token=abc");
  });

  it("preserves nested base paths", () => {
    const url = new URL("https://example.com/app/invite/def");
    const redirect = buildInviteLandingUrl(url, "/app/", "def");
    expect(redirect.pathname).toBe("/app/");
    expect(redirect.search).toBe("?token=def");
  });

  it("omits the query string when the token is missing", () => {
    const url = new URL("https://example.com/invite");
    const redirect = buildInviteLandingUrl(url, "/", null);
    expect(redirect.pathname).toBe("/");
    expect(redirect.search).toBe("");
  });
});
