import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import type { REST } from "discord.js";

import { listTextChannelsRest } from "../discord/rest-channels.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import { searchGuildMessagesRest } from "../discord/rest-search.js";
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
    version: "0.2.0",
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

  server.registerTool(
    "search_discord_messages",
    {
      description:
        "Discord 서버의 접근 가능한 텍스트 채널에서 메시지를 검색합니다. 내용, 채널, 작성자, 기간을 조합해 과거 논의와 결정 근거를 찾을 수 있습니다.",
      inputSchema: z.object({
        query: z
          .string()
          .max(1024)
          .optional()
          .describe("메시지 내용 검색어"),
        channelId: z
          .string()
          .min(1)
          .optional()
          .describe("특정 Discord 텍스트 채널 ID"),
        authorId: z
          .string()
          .min(1)
          .optional()
          .describe("특정 Discord 작성자 사용자 ID"),
        after: z
          .string()
          .optional()
          .describe("이 시각 이후 메시지. ISO 8601 date-time 권장"),
        before: z
          .string()
          .optional()
          .describe("이 시각 이전 메시지. ISO 8601 date-time 권장"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(25)
          .describe("반환할 검색 결과 개수"),
        sort: z
          .enum(["newest", "oldest", "relevance"])
          .default("newest")
          .describe("검색 결과 정렬 방식"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      query,
      channelId,
      authorId,
      after,
      before,
      limit,
      sort,
    }) => {
      const channels = await listTextChannelsRest(
        rest,
        guildId,
      );
      const channelById = new Map(
        channels.map((channel) => [channel.id, channel]),
      );

      if (channelId && !channelById.has(channelId)) {
        throw new Error(
          `접근 가능한 Discord 텍스트 채널을 찾을 수 없습니다: ${channelId}`,
        );
      }

      const search = await searchGuildMessagesRest(
        rest,
        guildId,
        {
          content: query,
          channelIds: channelId
            ? [channelId]
            : channels.map((channel) => channel.id),
          authorIds: authorId ? [authorId] : undefined,
          after,
          before,
          limit,
          sort,
        },
      );

      const bridgeMessages = search.messages.flatMap(
        (message) => {
          const channel = channelById.get(message.channel_id);
          if (!channel) return [];

          return [
            toBridgeMessageRest(message, {
              guildId,
              guildName,
              channelId: channel.id,
              channelName: channel.name,
            }),
          ];
        },
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalResults: search.totalResults,
                returnedResults: bridgeMessages.length,
                messages: bridgeMessages,
              },
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
