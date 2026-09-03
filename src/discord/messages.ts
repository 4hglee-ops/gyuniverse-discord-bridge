import {
  ChannelType,
  type Client,
  type Message,
} from "discord.js";

export async function getRecentMessages(
  client: Client,
  channelId: string,
  limit = 20,
): Promise<Message[]> {
  const channel = await client.channels.fetch(channelId);

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error(`텍스트 채널을 찾을 수 없습니다: ${channelId}`);
  }

  const messages = await channel.messages.fetch({
    limit,
  });

  return [...messages.values()].reverse();
}
