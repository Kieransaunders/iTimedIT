export function prefersHtmlInviteResponse(acceptHeader: string | null) {
  if (!acceptHeader) {
    return false;
  }

  const header = acceptHeader.toLowerCase();
  const acceptsHtml = header.includes("text/html") || header.includes("application/xhtml+xml");
  if (!acceptsHtml) {
    return false;
  }

  const acceptsJson = header.includes("application/json") || header.includes("+json");
  return !acceptsJson;
}

export function extractInvitePathDetails(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const inviteIndex = segments.lastIndexOf("invite");

  if (inviteIndex === -1) {
    return {
      basePath: url.pathname || "/",
      tokenFromPath: null,
    };
  }

  const baseSegments = segments.slice(0, inviteIndex);
  const tokenFromPath = inviteIndex + 1 < segments.length ? segments[inviteIndex + 1] : null;

  return {
    basePath: baseSegments.length === 0 ? "/" : `/${baseSegments.join("/")}/`,
    tokenFromPath,
  };
}

export function buildInviteLandingUrl(url: URL, basePath: string, token: string | null) {
  const normalizedPath = basePath === "/" ? "/" : basePath.endsWith("/") ? basePath : `${basePath}/`;
  const target = new URL(normalizedPath, url);
  target.search = "";
  target.hash = "";

  if (token) {
    target.searchParams.set("token", token);
  }

  return target;
}
