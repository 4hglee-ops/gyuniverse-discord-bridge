import { z } from "zod";
import { ScopedDiscordReader } from "../access/discord-reader.js";
import { legacyScope } from "../access/scope.js";
import { McpServer } from "@modelcontextprotocol/server";
import type { REST } from "discord.js";

import { listTextChannelsRest } from "../discord/rest-channels.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import { searchGuildMessagesRest } from "../discord/rest-search.js";
import { toBridgeMessageRest } from "../adapters/discord-rest-message-adapter.js";
import { createTeamContextSnapshot } from "../context/team-context-snapshot.js";
import {
  createDecisionLedgerContext,
  createTeamBriefContext,
  createTeamDeltaContext,
} from "../context/team-context-workflows.js";
import {
  createTeamStateCheckpoint,
  diffTeamStates,
  readTeamStateCheckpoint,
} from "../context/team-state-checkpoint.js";

export interface RestMcpServerOptions {
  rest: REST;
  guildId: string;
  guildName: string;
  reader?: ScopedDiscordReader;
}

const stateItemSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
});

const normalizedStateSchema = z.object({
  decisions: z.array(stateItemSchema).default([]),
  work: z.array(stateItemSchema).default([]),
  blockers: z.array(stateItemSchema).default([]),
  questions: z.array(stateItemSchema).default([]),
  proposals: z.array(stateItemSchema).default([]),
});

const checkpointMetadataSchema = z.object({
  snapshotAt: z.string().min(1),
  baselineVersion: z.string().min(1),
  historyComplete: z.boolean(),
  newestMessageAt: z.string().nullable(),
});

export function buildRestMcpServer(
  options: RestMcpServerOptions,
): McpServer {
  const { rest, guildId, guildName } = options;
  const reader = options.reader ?? new ScopedDiscordReader(rest, legacyScope(guildId, guildName));

  const server = new McpServer({
    name: "gyuniverse-discord-bridge",
    version: "0.6.0",
  });

  server.registerTool(
    "list_discord_channels",
    {
      description: "Discord 서버에서 봇이 접근 가능한 텍스트 채널 목록을 조회합니다.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const result = await reader.listChannels();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_recent_discord_messages",
    {
      description: "지정한 Discord 텍스트 채널의 최근 메시지를 조회합니다.",
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
      const bridgeMessages = await reader.recentMessages(channelId, limit);
      return { content: [{ type: "text", text: JSON.stringify(bridgeMessages, null, 2) }] };
    },
  );

  server.registerTool(
    "get_team_context_snapshot",
    {
      description:
        "여러 Discord 채널의 최근 메시지를 하나의 Evidence Pack으로 모읍니다. 의미 판정은 하지 않습니다.",
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
      const result = await reader.snapshot({ channelIds, since, perChannelLimit });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_team_brief_context",
    {
      description:
        "현재 팀 상태 브리핑을 위한 Decision Baseline + Snapshot + Team Brief Contract를 반환합니다.",
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
      const result = await reader.context("brief", { channelIds, since, perChannelLimit });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_decision_ledger_context",
    {
      description:
        "Decision Baseline, 열린 결정 후보, 최신 Discord Snapshot과 Decision Ledger Contract를 반환합니다.",
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
      const result = await reader.context("ledger", { channelIds, since, perChannelLimit });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "get_team_delta_context",
    {
      description:
        "기준 시각 이후 변화 분석용 Decision Baseline + Snapshot + Delta Brief Contract를 반환합니다.",
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
      const result = await reader.context("delta", { channelIds, since, lookbackHours, perChannelLimit });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "create_team_state_checkpoint",
    {
      description:
        "Evidence 규칙으로 이미 해석된 팀 상태를 서명된 checkpoint token으로 만듭니다. 의미 판정은 하지 않습니다.",
      inputSchema: z.object({
        state: normalizedStateSchema,
        metadata: checkpointMetadataSchema,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ state, metadata }) => {
      const result = createTeamStateCheckpoint(state, metadata);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "compare_team_state_checkpoint",
    {
      description:
        "이전 checkpoint와 현재 정규화 팀 상태를 비교해 added/removed/status_changed/content_changed 전이를 계산합니다.",
      inputSchema: z.object({
        previousCheckpointToken: z.string().min(1),
        currentState: normalizedStateSchema,
        currentMetadata: checkpointMetadataSchema,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ previousCheckpointToken, currentState, currentMetadata }) => {
      const previous = readTeamStateCheckpoint(previousCheckpointToken);
      const current = createTeamStateCheckpoint(currentState, currentMetadata);
      const diff = diffTeamStates(previous, current.checkpoint);
      const result = {
        previousCheckpoint: previous,
        currentCheckpointToken: current.token,
        currentCheckpoint: current.checkpoint,
        diff,
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "search_discord_messages",
    {
      description:
        "Discord 메시지 과거 검색. 결정 이유, 변경 이력, 특정 키워드/기간/작성자 Evidence 보완에 사용합니다.",
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
    async ({ query, channelId, authorId, after, before, limit, sort }) => {
      const result = await reader.search({query, channelId, authorId, after, before, limit, sort});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}
