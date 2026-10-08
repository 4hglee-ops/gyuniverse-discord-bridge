import type { REST } from "discord.js";
import { listTextChannelsRest, type DiscordRestChannelSummary } from "../discord/rest-channels.js";
import type { AccessStore } from "./store.js";
import { AccessDeniedError, ScopeSelectionError, type AccessScope, type GuildGrant, type Principal } from "./types.js";

export function legacyScope(guildId: string, guildName: string): AccessScope {
  return {
    principal: { kind: "legacy", userId: "gyuniverse-team", role: "admin" },
    guilds: [{
      id: guildId,
      name: guildName,
      mode: "all_channels",
      allowedChannelIds: new Set<string>(),
    }],
  };
}

export async function scopeForPrincipal(
  principal: Principal,
  store: AccessStore | null,
  legacyGuildId: string,
  legacyGuildName: string,
): Promise<AccessScope> {
  if (principal.kind === "legacy") return legacyScope(legacyGuildId, legacyGuildName);
  if (!store) throw new AccessDeniedError();
  const user = await store.userById(principal.userId);
  if (!user?.enabled) throw new AccessDeniedError();
  return { principal, guilds: await store.grantsForUser(principal.userId) };
}

export function selectGuild(scope: AccessScope, serverId?: string): GuildGrant {
  if (serverId) {
    const guild = scope.guilds.find((item) => item.id === serverId);
    if (!guild) throw new AccessDeniedError();
    return guild;
  }
  if (scope.guilds.length === 0) throw new AccessDeniedError();
  if (scope.guilds.length > 1) throw new ScopeSelectionError();
  return scope.guilds[0];
}

export function canReadChannel(guild: GuildGrant, channelId: string): boolean {
  return guild.mode === "all_channels" || guild.allowedChannelIds.has(channelId);
}

export async function visibleChannels(
  rest: REST,
  guild: GuildGrant,
): Promise<DiscordRestChannelSummary[]> {
  const discordChannels = await listTextChannelsRest(rest, guild.id);
  return discordChannels.filter((channel) => canReadChannel(guild, channel.id));
}

export async function resolveReadableChannel(
  rest: REST,
  scope: AccessScope,
  channelId: string,
  serverId?: string,
): Promise<{ guild: GuildGrant; channel: DiscordRestChannelSummary }> {
  const guilds = serverId ? [selectGuild(scope, serverId)] : scope.guilds;
  for (const guild of guilds) {
    const channel = (await visibleChannels(rest, guild)).find((item) => item.id === channelId);
    if (channel) return { guild, channel };
  }
  throw new AccessDeniedError();
}
