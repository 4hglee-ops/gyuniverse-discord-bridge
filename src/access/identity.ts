import { createHash, timingSafeEqual } from "node:crypto";
import { bearerToken, validOAuthAccessToken } from "../oauth/stateless.js";
import { configuredAccessStore, type AccessStore } from "./store.js";
import type { Principal } from "./types.js";

const legacyPrincipal: Principal = {
  kind: "legacy",
  userId: "gyuniverse-team",
  role: "admin",
};

function equalsSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function personalAuthOnly(): boolean {
  return process.env.BRIDGE_PERSONAL_AUTH_ONLY?.trim().toLowerCase() === "true";
}

export function hashPersonalKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}
export function isPersonalKey(key: string): boolean {
  return /^gdb_[A-Za-z0-9_-]{32,160}$/.test(key);
}

export async function principalFromPersonalKey(
  key: string,
  store: AccessStore | null = configuredAccessStore(),
): Promise<Principal | null> {
  if (!isPersonalKey(key) || !store) return null;
  const credential = await store.credentialByHash(hashPersonalKey(key));
  if (!credential || credential.revoked_at) return null;

  const user = await store.userById(credential.user_id);
  if (!user?.enabled) return null;

  return {
    kind: "personal",
    userId: user.id,
    role: user.role,
    credentialId: credential.id,
  };
}

export async function principalFromMcpRequest(
  request: Request,
  store: AccessStore | null = configuredAccessStore(),
): Promise<Principal | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const shared = process.env.MCP_SHARED_SECRET?.trim();
  if (!personalAuthOnly() && shared && equalsSecret(token, shared)) return legacyPrincipal;

  if (isPersonalKey(token)) return principalFromPersonalKey(token, store);
  if (personalAuthOnly()) return null;

  // Existing v1 OAuth team approvals are deliberately limited to
  // the legacy server until per-user OAuth credentials are introduced.
  if (await validOAuthAccessToken(token)) return legacyPrincipal;
  return null;
}

export async function principalFromGptRequest(
  request: Request,
  store: AccessStore | null = configuredAccessStore(),
): Promise<Principal | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const shared = process.env.GPT_ACTIONS_API_KEY?.trim();
  if (!personalAuthOnly() && shared && equalsSecret(token, shared)) return legacyPrincipal;
  return principalFromPersonalKey(token, store);
}
