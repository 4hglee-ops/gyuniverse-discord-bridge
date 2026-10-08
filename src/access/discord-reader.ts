import type { REST } from "discord.js";
import { visibleChannels, resolveReadableChannel, selectGuild } from "./scope.js";
import { createTeamContextSnapshot } from "../context/team-context-snapshot.js";
import { createTeamBriefContext, createDecisionLedgerContext, createTeamDeltaContext } from "../context/team-context-workflows.js";
import { searchGuildMessagesRest, type DiscordMessageSearchSort } from "../discord/rest-search.js";
import { AccessDeniedError, type AccessScope } from "./types.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import { toBridgeMessageRest } from "../adapters/discord-rest-message-adapter.js";

export class ScopedDiscordReader {
  constructor(readonly rest: REST, readonly scope: AccessScope) {}

  listServers() {
    return this.scope.guilds.map(({ id, name }) => ({ id, name }));
  }

  async listChannels(serverId?: string) {
    const guilds = serverId ? [selectGuild(this.scope, serverId)] : this.scope.guilds;
    const pages = await Promise.all(guilds.map(async (guild) =>
      (await visibleChannels(this.rest, guild)).map((channel) => ({
        ...channel, guildName: guild.name,
      })),
    ));
    return pages.flat();
  }

  async recentMessages(channelId: string, limit = 20, serverId?: string) {
    const { guild, channel } = await resolveReadableChannel(this.rest, this.scope, channelId, serverId);
    return (await getRecentMessagesRest(this.rest, channelId, limit))
      .filter((message) => message.channel_id === channelId)
      .map((message) => toBridgeMessageRest(message, {
        guildId: guild.id, guildName: guild.name,
        channelId: channel.id, channelName: channel.name,
      }));
  }

  async contextChannels(serverId?: string, requestedIds?: string[]) {
    const guild = selectGuild(this.scope, serverId);
    const channels = await visibleChannels(this.rest, guild);
    const allowed = new Set(channels.map((channel) => channel.id));
    if (requestedIds?.some((id) => !allowed.has(id))) throw new AccessDeniedError();
    return { guild, channelIds: requestedIds ?? channels.map((channel) => channel.id) };
  }
  async snapshot(options: { serverId?: string; channelIds?: string[]; since?: string; perChannelLimit?: number }) {
    const { guild, channelIds } = await this.contextChannels(options.serverId, options.channelIds);
    return createTeamContextSnapshot({
      rest: this.rest, guildId: guild.id, guildName: guild.name,
      channelIds, allowedChannelIds: channelIds,
      since: options.since, perChannelLimit: options.perChannelLimit,
    });
  }

  async context(
    kind: "brief" | "ledger" | "delta",
    options: { serverId?: string; channelIds?: string[]; since?: string; perChannelLimit?: number; lookbackHours?: number },
  ) {
    const { guild, channelIds } = await this.contextChannels(options.serverId, options.channelIds);
    const args = {
      rest: this.rest, guildId: guild.id, guildName: guild.name,
      channelIds, allowedChannelIds: channelIds,
      since: options.since, perChannelLimit: options.perChannelLimit,
      // Non-legacy guilds must never receive the global v1 Decision Baseline.
      includeLegacyBaseline: this.scope.principal.kind === "legacy",
    };
    if (kind === "brief") return createTeamBriefContext(args);
    if (kind === "ledger") return createDecisionLedgerContext(args);
    return createTeamDeltaContext({...args, lookbackHours: options.lookbackHours});
  }

  async search(options: {
    serverId?: string; channelId?: string; query?: string;
    authorId?: string; after?: string; before?: string;
    limit?: number; sort?: DiscordMessageSearchSort;
  }) {
    const resolved = options.channelId
      ? await resolveReadableChannel(this.rest, this.scope, options.channelId, options.serverId)
      : null;
    const guild = resolved?.guild ?? selectGuild(this.scope, options.serverId);
    const channels = resolved
      ? [resolved.channel]
      : await visibleChannels(this.rest, guild);
    if (channels.length === 0) {
      return {
        totalResults: 0, returnedResults: 0, searchMode: "recent-fallback",
        historyComplete: false, scannedMessages: 0, messages: [],
      };
    }
    const byId = new Map(channels.map((channel) => [channel.id, channel]));
    const search = await searchGuildMessagesRest(this.rest, guild.id, {
      content: options.query,
      channelIds: channels.map((channel) => channel.id),
      authorIds: options.authorId ? [options.authorId] : undefined,
      after: options.after, before: options.before,
      limit: options.limit, sort: options.sort,
    });
    const messages = search.messages.flatMap((message) => {
      const channel = byId.get(message.channel_id);
      return channel ? [toBridgeMessageRest(message, {
        guildId: guild.id, guildName: guild.name,
        channelId: channel.id, channelName: channel.name,
      })] : [];
    });
    return {
      totalResults: messages.length === search.messages.length ? search.totalResults : messages.length,
      returnedResults: messages.length,
      searchMode: search.searchMode, historyComplete: search.historyComplete,
      scannedMessages: search.scannedMessages ?? null, messages,
    };
  }

}
