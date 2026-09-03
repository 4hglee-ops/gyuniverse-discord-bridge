import {
  Routes,
  type REST,
} from "discord.js";

export interface DiscordRestMessage {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;

  author: {
    id: string;
    username: string;
    global_name?: string | null;
  };

  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    content_type?: string | null;
  }>;
}

export async function getRecentMessagesRest(
  rest: REST,
  channelId: string,
  limit = 20,
): Promise<DiscordRestMessage[]> {
  const messages = await rest.get(
    Routes.channelMessages(channelId),
    {
      query: new URLSearchParams({
        limit: String(limit),
      }),
    },
  ) as DiscordRestMessage[];

  return [...messages].reverse();
}
