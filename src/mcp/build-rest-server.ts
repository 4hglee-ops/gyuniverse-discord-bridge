import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import type { REST } from "discord.js";

import { listTextChannelsRest } from "../discord/rest-channels.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import { toBridgeMessageRest } from "../adapters/discord-rest-message-adapter.js";

export interface RestMcpServerOptions {
  rest: REST;
  guildId: string;
  guildName: string;
}

export function buildRestMcpServer(
  options: RestMcpServerOptions,
): McpServer {
  const {
    rest,
    guildId,
    guildName,
  } = options;

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
        await listTextChannelsRest(
          rest,
          guildId,
        );

      const result = channels.map(
        (channel) => ({
          ...channel,
          guildName,
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              result,
              null,
              2,
            ),
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
      const channels =
        await listTextChannelsRest(
          rest,
          guildId,
        );

      const channel = channels.find(
        (item) => item.id === channelId,
      );

      if (!channel) {
        throw new Error(
          `접근 가능한 Discord 텍스트 채널을 찾을 수 없습니다: ${channelId}`,
        );
      }

      const discordMessages =
        await getRecentMessagesRest(
          rest,
          channelId,
          limit,
        );

      const bridgeMessages =
        discordMessages.map(
          (message) =>
            toBridgeMessageRest(
              message,
              {
                guildId,
                guildName,
                channelId,
                channelName:
                  channel.name,
              },
            ),
        );

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
