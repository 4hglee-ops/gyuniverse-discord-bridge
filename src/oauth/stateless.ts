const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const OAUTH_SCOPE = "discord:read";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_CODE_TTL_SECONDS = 120;

export interface RegisteredClientPayload {
  typ: "registered_client";
  redirectUris: string[];
  clientName?: string;
  iat: number;
}

export interface AuthorizationCodePayload {
  typ: "authorization_code";
  clientId: string;
  redirectUri: string;
  resource: string;
  scope: string;
  codeChallenge: string;
  iat: number;
  exp: number;
}

export interface AccessTokenPayload {
  typ: "access_token";
  aud: string;
  scope: string;
  sub: "gyuniverse-team";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  typ: "refresh_token";
  aud: string;
  scope: string;
  clientId: string;
  sub: "gyuniverse-team";
  iat: number;
  exp: number;
}

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function publicBaseUrl(): string {
  const configured = env("PUBLIC_BASE_URL");
  if (configured) return configured.replace(/\/$/, "");

  const vercelHost = env("VERCEL_URL");
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

export function canonicalMcpResource(): string {
  return `${publicBaseUrl()}/mcp`;
}

export function oauthTeamCode(): string | null {
  return env("MCP_OAUTH_TEAM_CODE");
}

function signingSecret(): string | null {
  return env("MCP_OAUTH_SIGNING_SECRET");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToArrayBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

async function hmacKey(): Promise<CryptoKey | null> {
  const secret = signingSecret();
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signEnvelope(prefix: string, payload: object): Promise<string> {
  const key = await hmacKey();
  if (!key) throw new Error("OAuth signing secret is not configured.");
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const message = `${prefix}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return `${message}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyEnvelope<T>(token: string, prefix: string): Promise<T | null> {
  const [actualPrefix, body, signature] = token.split(".");
  if (actualPrefix !== prefix || !body || !signature) return null;
  const key = await hmacKey();
  if (!key) return null;
  const message = `${actualPrefix}.${body}`;
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlToArrayBuffer(signature), encoder.encode(message));
  if (!valid) return null;
  try {
    return JSON.parse(decoder.decode(base64UrlToArrayBuffer(body))) as T;
  } catch {
    return null;
  }
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function scopeIsAllowed(scope: string | null): boolean {
  if (!scope) return true;
  return scope.split(/\s+/).filter(Boolean).every((item) => item === OAUTH_SCOPE);
}

export function normalizeScope(scope: string | null): string {
  return scope?.trim() || OAUTH_SCOPE;
}

export function isAllowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return false;

    if (
      url.protocol === "https:" &&
      (url.hostname === "claude.ai" || url.hostname === "claude.com") &&
      url.pathname === "/api/mcp/auth_callback"
    ) return true;

    if (
      url.protocol === "https:" &&
      url.hostname === "chatgpt.com" &&
      url.pathname === "/connector_platform_oauth_redirect"
    ) return true;

    if (
      url.protocol === "https:" &&
      url.hostname === "chatgpt.com" &&
      /^\/connector\/oauth\/[^/]+$/.test(url.pathname)
    ) return true;

    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

export async function validOAuthAccessToken(token: string): Promise<boolean> {
  const payload = await verifyEnvelope<AccessTokenPayload>(token, "gya");
  if (!payload || payload.typ !== "access_token") return false;
  if (payload.exp <= nowSeconds()) return false;
  if (payload.aud !== canonicalMcpResource()) return false;
  return payload.scope.split(/\s+/).includes(OAUTH_SCOPE);
}
