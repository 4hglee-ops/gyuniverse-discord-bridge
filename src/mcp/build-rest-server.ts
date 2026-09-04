import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";
import type { REST } from "discord.js";

import { listTextChannelsRest } from "../discord/rest-channels.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import { searchGuildMessagesRest } from "../discord/rest-search.js";
import { toBridgeMessageRest } from "../adapters/discord-rest-message-adapter.js";
import { createTeamContextSnapshot } from "../context/team-context-snapshot.js";
import {
  createTeamBriefContext,
  createTeamDeltaContext,
} from "../context/team-context-workflows.js";

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
    version: "0.4.0",
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
      const channels = await listTextChannelsRest(rest, guildId);
      const result = channels.map((channel) => ({ ...channel, guildName }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
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
        channelId: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ channelId, limit }) => {
      const channels = await listTextChannelsRest(rest, guildId);
      const channel = channels.find((item) => item.id === channelId);

      if (!channel) {
        throw new Error(
          `접근 가능한 Discord 텍스트 채널을 찾을 수 없습니다: ${channelId}`,
        );
      }

      const discordMessages = await getRecentMessagesRest(
        rest,
        channelId,
        limit,
      );

      const bridgeMessages = discordMessages.map((message) =>
        toBridgeMessageRest(message, {
          guildId,
          guildName,
          channelId,
          channelName: channel.name,
        }),
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(bridgeMessages, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_team_context_snapshot",
    {
      description:
        "여러 Discord 채널의 최근 메시지를 하나의 Evidence Pack으로 모읍니다. Team Brief, Decision Ledger, Delta Brief의 공통 원본 입력용이며 의미 판정은 하지 않습니다.",
      inputSchema: z.object({
        channelIds: z.array(z.string().min(1)).max(20).optional(),
        since: z.string().optional(),
        perChannelLimit: z.number().int().min(1).max(100).default(50),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ channelIds, since, perChannelLimit }) => {
      const result = await createTeamContextSnapshot({
        rest,
        guildId,
        guildName,
        channelIds,
        since,
        perChannelLimit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_team_brief_context",
    {
      description:
        "현재 팀 상태 브리핑을 만들기 위한 Snapshot + 공통 Team Brief v2 판정/출력 Contract를 반환합니다. 이 결과를 읽고 필요한 과거 결정만 search_discord_messages로 보완한 뒤 contract.sections 순서로 브리핑하세요.",
      inputSchema: z.object({
        channelIds: z.array(z.string().min(1)).max(20).optional(),
        since: z
          .string()
          .optional()
          .describe("선택적 최근 범위 시작 시각. 생략하면 최근 메시지 bounded snapshot"),
        perChannelLimit: z.number().int().min(1).max(100).default(50),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ channelIds, since, perChannelLimit }) => {
      const result = await createTeamBriefContext({
        rest,
        guildId,
        guildName,
        channelIds,
        since,
        perChannelLimit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_team_delta_context",
    {
      description:
        "기준 시각 이후 무엇이 바뀌었는지 Delta Brief를 만들기 위한 Snapshot + Delta Brief v1 Contract를 반환합니다. since를 생략하면 기본 24시간을 사용합니다.",
      inputSchema: z.object({
        channelIds: z.array(z.string().min(1)).max(20).optional(),
        since: z.string().optional(),
        lookbackHours: z.number().int().min(1).max(168).default(24),
        perChannelLimit: z.number().int().min(1).max(100).default(50),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ channelIds, since, lookbackHours, perChannelLimit }) => {
      const result = await createTeamDeltaContext({
        rest,
        guildId,
        guildName,
        channelIds,
        since,
        lookbackHours,
        perChannelLimit,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search_discord_messages",
    {
      description:
        "Discord 서버의 접근 가능한 텍스트 채널에서 메시지를 검색합니다. 과거 결정 이유, 변경 이력, 특정 키워드/기간/작성자 Evidence 보완에 사용합니다. Discord 검색 인덱스가 준비되지 않은 경우 최근 메시지 범위에서 제한적으로 대체 검색합니다.",
      inputSchema: z.object({
        query: z.string().max(1024).optional(),
        channelId: z.string().min(1).optional(),
        authorId: z.string().min(1).optional(),
        after: z.string().optional(),
        before: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        sort: z.enum(["newest", "oldest", "relevance"]).default("newest"),
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
      const channels = await listTextChannelsRest(rest, guildId);
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

      const bridgeMessages = search.messages.flatMap((message) => {
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
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                totalResults: search.totalResults,
                returnedResults: bridgeMessages.length,
                searchMode: search.searchMode,
                historyComplete: search.historyComplete,
                scannedMessages: search.scannedMessages ?? null,
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
