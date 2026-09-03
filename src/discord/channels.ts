import {
  ChannelType,
  type Client,
} from "discord.js";

export interface DiscordChannelSummary {
  id: string;
  name: string;
  guildId: string;
  guildName: string;
}

export async function listTextChannels(
  client: Client,
): Promise<DiscordChannelSummary[]> {
  const result: DiscordChannelSummary[] = [];

  for (const guild of client.guilds.cache.values()) {
    const channels = await guild.channels.fetch();

    for (const channel of channels.values()) {
      if (!channel || channel.type !== ChannelType.GuildText) {
        continue;
      }

      result.push({
        id: channel.id,
        name: channel.name,
        guildId: guild.id,
        guildName: guild.name,
      });
    }
  }

  return result;
}
