import type { Client } from "discord.js";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";

import { listTextChannels } from "../discord/channels.js";
import { getRecentMessages } from "../discord/messages.js";
import { toBridgeMessage } from "../adapters/discord-message-adapter.js";

export function buildMcpServer(
  discordClient: Client,
): McpServer {
  const server = new McpServer({
    name: "gyuniverse-discord-bridge",
    version: "0.1.0",
  });

  server.registerTool(
    "list_discord_channels",
    {
      description:
        "Discord 서버에서 봇이 접근 가능한 텍스트 채널 목록을 조회합니다.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const channels =
        await listTextChannels(discordClient);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(channels, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_recent_discord_messages",
    {
      description:
        "지정한 Discord 텍스트 채널의 최근 메시지를 조회합니다.",
      inputSchema: z.object({
        channelId: z
          .string()
          .min(1)
          .describe("Discord 텍스트 채널 ID"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe("가져올 최근 메시지 개수"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ channelId, limit }) => {
      const discordMessages =
        await getRecentMessages(
          discordClient,
          channelId,
          limit,
        );

      const bridgeMessages =
        discordMessages.map(toBridgeMessage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              bridgeMessages,
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
