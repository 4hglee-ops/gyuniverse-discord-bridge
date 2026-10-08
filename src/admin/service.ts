import { randomBytes, timingSafeEqual } from "node:crypto";
import { Routes, ChannelType, type REST } from "discord.js";
import { hashPersonalKey } from "../access/identity.js";
import type { GuildAccessMode } from "../access/types.js";

const snowflake = /^[0-9]{16,22}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export interface AdminStore {
  rpc<T>(name: string, payload: Record<string, unknown>): Promise<T>;
}

export class SupabaseAdminStore implements AdminStore {
  constructor(private readonly base: string, private readonly key: string) {}
  async rpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.base + "/rest/v1/rpc/" + name, {
      method: "POST", cache: "no-store",
      headers: { apikey: this.key, Authorization: "Bearer " + this.key,
        "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Admin store RPC failed (" + response.status + ")");
    return await response.json() as T;
  }
}

export function adminStoreFromEnv(): AdminStore {
  const url = process.env.BRIDGE_SUPABASE_URL?.trim();
  const key = process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Admin storage is not configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" &&
     ["localhost","127.0.0.1"].includes(parsed.hostname))) throw new Error("HTTPS is required");
  return new SupabaseAdminStore(parsed.toString().replace(/\/$/,""), key);
}

export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.BRIDGE_ADMIN_API_KEY?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  if (!expected || expected.length < 32 || !authorization.startsWith("Bearer ")) return false;
  const presented = authorization.slice(7);
  const a=Buffer.from(presented), b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}

export async function syncGuild(
  rest: REST, store: AdminStore, guildId: string, create: boolean,
) {
  if (!snowflake.test(guildId)) throw new Error("Invalid guildId");
  const guild = await rest.get(Routes.guild(guildId)) as {id:string;name:string};
  if (guild.id !== guildId || !guild.name) throw new Error("Bot cannot verify guild");
  const raw = await rest.get(Routes.guildChannels(guildId)) as Array<{id:string;name?:string;type:number}>;
  const channels = raw.filter(c=>c.type===ChannelType.GuildText).map(c=>({id:c.id,name:c.name??c.id}));
  return store.rpc("bridge_sync_guild",{p_guild_id:guildId,p_guild_name:guild.name,
    p_channels:channels,p_create:create});
}

export async function executeAdminAction(
  body: unknown, rest: REST, store: AdminStore,
): Promise<unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  const b = body as Record<string,unknown>;
  if (b.action==="registerGuild" || b.action==="syncGuild") {
    if (typeof b.guildId!=="string") throw new Error("Invalid guildId");
    return syncGuild(rest,store,b.guildId,b.action==="registerGuild");
  }
  if (b.action==="createUser") {
    if (typeof b.displayName!=="string" || !b.displayName.trim() || b.displayName.length>80 ||
      !["admin","member","viewer"].includes(String(b.role))) throw new Error("Invalid user");
    return store.rpc("bridge_create_user",{p_display_name:b.displayName,p_role:b.role});
  }
  if (b.action==="setAccess") {
    if (typeof b.userId!=="string" || !uuid.test(b.userId) ||
      typeof b.guildId!=="string" || !snowflake.test(b.guildId) ||
      !["all_channels","selected_channels"].includes(String(b.mode)) ||
      !Array.isArray(b.channelIds) || b.channelIds.length>500 ||
      !b.channelIds.every(c=>typeof c==="string" && snowflake.test(c)) ||
      new Set(b.channelIds).size!==b.channelIds.length ||
      (b.mode==="all_channels" && b.channelIds.length!==0)) throw new Error("Invalid access grant");
    return store.rpc("bridge_set_access",{p_user_id:b.userId,p_guild_id:b.guildId,
      p_mode:b.mode as GuildAccessMode,p_channel_ids:b.channelIds});
  }
  if (b.action==="issueCredential") {
    if (typeof b.userId!=="string" || !uuid.test(b.userId)) throw new Error("Invalid userId");
    const key="gdb_"+randomBytes(32).toString("base64url");
    const metadata = await store.rpc("bridge_issue_credential",{
      p_user_id:b.userId,p_token_hash:hashPersonalKey(key),
    });
    return {credential:metadata,secret:key}; // delivered once; never stored as plaintext
  }
  if (b.action==="revokeCredential") {
    if (typeof b.credentialId!=="string" || !uuid.test(b.credentialId)) throw new Error("Invalid credentialId");
    return store.rpc("bridge_revoke_credential",{p_credential_id:b.credentialId});
  }
  throw new Error("Unsupported action");
}
