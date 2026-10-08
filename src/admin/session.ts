import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isAdminAuthorized } from "./service.js";

const COOKIE_NAME = "gdb_admin_session";
const SESSION_SECONDS = 60 * 60 * 2;

interface SessionPayload {
  v: 1;
  nonce: string;
  exp: number;
}

function secret(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length >= 32 ? value : null;
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function rawSession(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const item = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + "="));
  return item ? item.slice(COOKIE_NAME.length + 1) : null;
}

function verify(token: string): SessionPayload | null {
  const key = secret("BRIDGE_ADMIN_SESSION_SECRET");
  if (!key || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !equal(parts[1], signature(parts[0], key))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as SessionPayload;
    if (payload.v !== 1 || typeof payload.nonce !== "string" ||
      payload.nonce.length !== 32 || !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

function issueCsrf(token: string): string {
  const key = secret("BRIDGE_ADMIN_SESSION_SECRET");
  if (!key) throw new Error("Admin session signing is not configured.");
  return signature("csrf:" + token, key);
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

function isLocalHttp(url: URL): boolean {
  return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
}

export function sessionCookieHeader(request: Request, token: string, clear = false): string {
  const url = new URL(request.url);
  if (url.protocol !== "https:" && !isLocalHttp(url)) throw new Error("HTTPS required.");
  return [
    COOKIE_NAME + "=" + token,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/api/admin/v1",
    url.protocol === "https:" ? "Secure" : "",
    "Max-Age=" + (clear ? "0" : String(SESSION_SECONDS)),
  ].filter(Boolean).join("; ");
}

export function createAdminSession(request: Request, password: string): {
  csrf: string; cookie: string; expiresAt: string;
} | null {
  const expected = secret("BRIDGE_ADMIN_UI_PASSWORD");
  const signing = secret("BRIDGE_ADMIN_SESSION_SECRET");
  if (!expected || !signing) throw new Error("Admin UI authentication is not configured.");
  if (!sameOrigin(request) || !equal(password, expected)) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload: SessionPayload = { v: 1, nonce: randomBytes(24).toString("base64url"), exp };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = encoded + "." + signature(encoded, signing);
  return { csrf: issueCsrf(token), cookie: sessionCookieHeader(request, token),
    expiresAt: new Date(exp * 1000).toISOString() };
}

export function currentAdminSession(request: Request): { csrf: string; expiresAt: string } | null {
  const token = rawSession(request);
  const payload = token ? verify(token) : null;
  return payload && token
    ? { csrf: issueCsrf(token), expiresAt: new Date(payload.exp * 1000).toISOString() }
    : null;
}

export function adminRequestMode(request: Request, mutation = false): "bearer" | "session" | null {
  // Backend-to-backend clients may continue using the dedicated administrator API key.
  // Browser clients use HttpOnly cookies + CSRF and never receive the API key.
  if (isAdminAuthorized(request)) return "bearer";
  const session = currentAdminSession(request);
  if (!session) return null;
  if (!mutation) return "session";
  if (!sameOrigin(request)) return null;
  const presented = request.headers.get("x-bridge-csrf") ?? "";
  return equal(presented, session.csrf) ? "session" : null;
}
