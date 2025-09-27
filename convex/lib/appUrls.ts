const ENV_URL_KEYS = ["SITE_URL", "APP_ORIGIN", "VERCEL_URL"] as const;

type EnvUrlKey = (typeof ENV_URL_KEYS)[number];

function readConfiguredUrl() {
  for (const key of ENV_URL_KEYS) {
    const raw = process.env[key as EnvUrlKey];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return null;
}

function normalizeBaseUrl(raw: string | null) {
  if (!raw) {
    return "http://localhost:5173";
  }

  const prefixed = raw.startsWith("http") ? raw : `https://${raw}`;
  const trimmed = prefixed.replace(/\/$/, "");
  return trimmed || "http://localhost:5173";
}

let cachedBaseUrl: string | null = null;

export function getPublicAppUrl() {
  if (!cachedBaseUrl) {
    cachedBaseUrl = normalizeBaseUrl(readConfiguredUrl());
  }
  return cachedBaseUrl;
}

export function buildPublicAppUrl(path: string = "/", searchParams?: Record<string, string | undefined>) {
  const baseUrl = getPublicAppUrl();
  const normalizedPath = path && path !== "/" ? (path.startsWith("/") ? path : `/${path}`) : "";
  const target = `${baseUrl}${normalizedPath}`;

  if (!searchParams || Object.keys(searchParams).length === 0) {
    return target;
  }

  const url = new URL(target);
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
