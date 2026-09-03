import type { Message } from "discord.js";
import type {
  BridgeAttachment,
  BridgeMessage,
} from "../types/message.js";

export function toBridgeMessage(
  message: Message,
): BridgeMessage {
  if (!message.guild) {
    throw new Error(
      `서버 메시지가 아닙니다: ${message.id}`,
    );
  }

  const attachments: BridgeAttachment[] =
    [...message.attachments.values()].map((attachment) => ({
      id: attachment.id,
      name: attachment.name ?? "unknown",
      url: attachment.url,
      contentType: attachment.contentType,
    }));

  const channelName =
    "name" in message.channel
      ? message.channel.name ?? message.channelId
      : message.channelId;

  return {
    id: message.id,
    source: "discord",

    serverId: message.guild.id,
    serverName: message.guild.name,

    channelId: message.channelId,
    channelName,

    authorId: message.author.id,
    authorName:
      message.author.globalName ??
      message.author.username,

    content: message.content,
    timestamp: message.createdAt.toISOString(),

    attachments,
  };
}
