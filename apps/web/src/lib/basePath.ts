type BasePathGlobals = {
  __APP_BASE_URL__?: string;
  __APP_BASE_PATH__?: string;
};

function normalizeBaseUrl(value: string) {
  if (value === "/") {
    return "";
  }

  const trimmed = value.endsWith("/") ? value.slice(0, -1) : value;
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function readRawBaseUrl() {
  const globalObject = globalThis as BasePathGlobals;
  if (typeof globalObject.__APP_BASE_URL__ === "string") {
    return globalObject.__APP_BASE_URL__;
  }

  let detected = "/";

  try {
    const meta = import.meta as ImportMeta & { env?: { BASE_URL?: string } };
    if (typeof meta.env?.BASE_URL === "string") {
      detected = meta.env.BASE_URL;
    }
  } catch (error) {
    if (typeof process !== "undefined" && typeof process.env?.VITE_BASE_URL === "string") {
      detected = process.env.VITE_BASE_URL;
    }
  }

  globalObject.__APP_BASE_URL__ = detected;
  return detected;
}

function computeBasePath() {
  const globalObject = globalThis as BasePathGlobals;
  if (typeof globalObject.__APP_BASE_PATH__ === "string") {
    return globalObject.__APP_BASE_PATH__;
  }

  const raw = readRawBaseUrl();
  const normalized = normalizeBaseUrl(raw);
  globalObject.__APP_BASE_PATH__ = normalized;
  return normalized;
}

export function getAppBasePath() {
  return computeBasePath();
}

export function buildAppPath(path: string) {
  const basePath = computeBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!basePath) {
    return normalizedPath === "/" ? "/" : normalizedPath;
  }

  if (normalizedPath === "/" || normalizedPath === "") {
    return basePath || "/";
  }

  return `${basePath}${normalizedPath}`;
}

export function stripBasePath(pathname: string) {
  const basePath = computeBasePath();

  if (!basePath) {
    return pathname;
  }

  if (pathname === basePath || pathname === `${basePath}/`) {
    return "/";
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}
