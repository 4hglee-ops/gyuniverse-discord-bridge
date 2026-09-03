import {
  ChannelType,
  Routes,
  type REST,
} from "discord.js";

export interface DiscordRestChannelSummary {
  id: string;
  name: string;
  guildId: string;
}

interface DiscordApiChannel {
  id: string;
  name?: string;
  type: number;
}

export async function listTextChannelsRest(
  rest: REST,
  guildId: string,
): Promise<DiscordRestChannelSummary[]> {
  const channels = await rest.get(
    Routes.guildChannels(guildId),
  ) as DiscordApiChannel[];

  return channels
    .filter(
      (channel) =>
        channel.type === ChannelType.GuildText,
    )
    .map((channel) => ({
      id: channel.id,
      name: channel.name ?? channel.id,
      guildId,
    }));
}
