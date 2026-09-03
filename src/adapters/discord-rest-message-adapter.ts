import type { BridgeMessage } from "../types/message.js";
import type { DiscordRestMessage } from "../discord/rest-messages.js";

export interface DiscordRestMessageContext {
  guildId: string;
  guildName: string;
  channelId: string;
  channelName: string;
}

export function toBridgeMessageRest(
  message: DiscordRestMessage,
  context: DiscordRestMessageContext,
): BridgeMessage {
  return {
    id: message.id,
    source: "discord",

    serverId: context.guildId,
    serverName: context.guildName,

    channelId: context.channelId,
    channelName: context.channelName,

    authorId: message.author.id,
    authorName:
      message.author.global_name ??
      message.author.username,

    content: message.content,
    timestamp: message.timestamp,

    attachments: message.attachments.map(
      (attachment) => ({
        id: attachment.id,
        name: attachment.filename,
        url: attachment.url,
        contentType:
          attachment.content_type ?? null,
      }),
    ),
  };
}
