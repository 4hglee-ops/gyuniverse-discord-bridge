import type { BridgeRole, GuildAccessMode, GuildGrant } from "./types.js";

interface BridgeUser {
  id: string;
  role: BridgeRole;
  enabled: boolean;
}

interface BridgeCredential {
  id: string;
  user_id: string;
  revoked_at: string | null;
}

interface GuildAccessRow {
  guild_id: string;
  access_mode: GuildAccessMode;
}
interface GuildRow {
  id: string;
  name: string;
  enabled: boolean;
}
interface ChannelAccessRow {
  guild_id: string;
  channel_id: string;
}

export interface AccessStore {
  credentialByHash(hash: string): Promise<BridgeCredential | null>;
  userById(id: string): Promise<BridgeUser | null>;
  grantsForUser(userId: string): Promise<GuildGrant[]>;
}

export class SupabaseAccessStore implements AccessStore {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  private async rows<T>(table: string, fields: Record<string, string>): Promise<T[]> {
    const params = new URLSearchParams({ select: "*", ...fields });
    const res = await fetch(
      this.baseUrl + "/rest/v1/" + table + "?" + params.toString(),
      {
        cache: "no-store",
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: "Bearer " + this.serviceRoleKey,
          "Cache-Control": "no-store",
        },
      },
    );
    if (!res.ok) {
      // Do not include response body: it may reveal SQL metadata.
      throw new Error("Bridge access store returned HTTP " + res.status + ".");
    }
    return (await res.json()) as T[];
  }

  async credentialByHash(hash: string): Promise<BridgeCredential | null> {
    const result = await this.rows<BridgeCredential>("bridge_credentials", {
      token_hash: "eq." + hash,
      revoked_at: "is.null",
      limit: "1",
    });
    return result[0] ?? null;
  }

  async userById(id: string): Promise<BridgeUser | null> {
    const result = await this.rows<BridgeUser>("bridge_users", {
      id: "eq." + id,
      limit: "1",
    });
    return result[0] ?? null;
  }

  async grantsForUser(userId: string): Promise<GuildGrant[]> {
    const grants = await this.rows<GuildAccessRow>("bridge_guild_access", {
      user_id: "eq." + userId,
    });
    if (!grants.length) return [];

    const guildIds = [...new Set(grants.map((grant) => grant.guild_id))];
    const guilds = await this.rows<GuildRow>("bridge_guilds", {
      id: "in.(" + guildIds.join(",") + ")",
      enabled: "eq.true",
    });
    const byGuild = new Map(guilds.map((guild) => [guild.id, guild]));
    const channelGrants = await this.rows<ChannelAccessRow>("bridge_channel_access", {
      user_id: "eq." + userId,
      can_read: "eq.true",
    });

    return grants.flatMap((grant): GuildGrant[] => {
      const guild = byGuild.get(grant.guild_id);
      if (!guild) return [];
      return [{
        id: guild.id,
        name: guild.name,
        mode: grant.access_mode,
        allowedChannelIds: new Set(
          channelGrants
            .filter((channel) => channel.guild_id === guild.id)
            .map((channel) => channel.channel_id),
        ),
      }];
    });
  }
}

// With no database configuration the existing v1 server remains usable,
// but personal credentials are never accepted (fail closed).
export function configuredAccessStore(): AccessStore | null {
  const url = process.env.BRIDGE_SUPABASE_URL?.trim();
  const key = process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Bridge access store is partially configured.");

  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
  ) {
    throw new Error("Bridge access store requires HTTPS outside localhost.");
  }
  return new SupabaseAccessStore(parsed.toString().replace(/\/$/, ""), key);
}
