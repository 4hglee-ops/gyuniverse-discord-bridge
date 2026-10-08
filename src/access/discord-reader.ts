import type { REST } from "discord.js";
import { visibleChannels, resolveReadableChannel, selectGuild } from "./scope.js";
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
}
