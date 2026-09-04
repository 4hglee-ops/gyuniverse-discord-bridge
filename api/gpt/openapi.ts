export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;

  const channelIdsParameter = {
    name: "channelIds",
    in: "query",
    required: false,
    description:
      "Comma-separated Discord channel IDs. Omit to include every accessible text channel. Maximum 20 channels.",
    schema: { type: "string" },
  };

  const sinceParameter = {
    name: "since",
    in: "query",
    required: false,
    description: "ISO 8601 start time for the context window.",
    schema: { type: "string", format: "date-time" },
  };

  const perChannelLimitParameter = {
    name: "perChannelLimit",
    in: "query",
    required: false,
    description: "Maximum recent messages fetched per channel. Defaults to 50.",
    schema: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      default: 50,
    },
  };

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Gyuniverse Discord GPT Actions",
      version: "1.3.1",
      description:
        "Read-only Discord team-context Actions for snapshots, team briefs, delta briefs, focused reads, and historical evidence search.",
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/gpt/v1/channels": {
        get: {
          operationId: "listDiscordChannels",
          summary: "List accessible Discord text channels",
          description:
            "Lists text channels that the configured Discord bot can access.",
          responses: {
            "200": {
              description: "Accessible Discord channels",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["guild", "channels"],
                    properties: {
                      guild: { $ref: "#/components/schemas/Guild" },
                      channels: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Channel" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/messages": {
        get: {
          operationId: "getRecentDiscordMessages",
          summary: "Read recent messages from one Discord channel",
          description:
            "Use for a focused single-channel read. For team-wide briefing, prefer getTeamBriefContext.",
          parameters: [
            {
              name: "channelId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
          ],
          responses: {
            "200": {
              description: "Recent Discord messages",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["channel", "messages"],
                    properties: {
                      channel: { $ref: "#/components/schemas/Channel" },
                      messages: {
                        type: "array",
                        items: { $ref: "#/components/schemas/BridgeMessage" },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/api/gpt/v1/context-snapshot": {
        get: {
          operationId: "getTeamContextSnapshot",
          summary: "Build the shared Discord Evidence Pack",
          description:
            "Collects recent messages across channels with freshness and completeness metadata without interpreting team state.",
          parameters: [
            channelIdsParameter,
            sinceParameter,
            perChannelLimitParameter,
          ],
          responses: {
            "200": {
              description: "Team Context Snapshot",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamContextSnapshot" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/team-brief-context": {
        get: {
          operationId: "getTeamBriefContext",
          summary: "Get current Team Brief context and contract",
          description:
            "Primary action for current team status, progress, blockers, risks, questions, proposals, and decisions needed. Returns a Snapshot plus the Team Brief v2 contract. Search history only when the Snapshot lacks required evidence.",
          parameters: [
            channelIdsParameter,
            sinceParameter,
            perChannelLimitParameter,
          ],
          responses: {
            "200": {
              description: "Team Brief Context",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamBriefContext" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/team-delta-context": {
        get: {
          operationId: "getTeamDeltaContext",
          summary: "Get Delta Brief context for what changed",
          description:
            "Primary action for changes since yesterday, a meeting, today, or a specified time. Returns only that time window plus the Delta Brief v1 contract instead of repeating the full Team Brief.",
          parameters: [
            channelIdsParameter,
            sinceParameter,
            {
              name: "lookbackHours",
              in: "query",
              required: false,
              description:
                "Used only when since is omitted. Defaults to the previous 24 hours, maximum 168 hours.",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 168,
                default: 24,
              },
            },
            perChannelLimitParameter,
          ],
          responses: {
            "200": {
              description: "Delta Brief Context",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamDeltaContext" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/search": {
        get: {
          operationId: "searchDiscordMessages",
          summary: "Search Discord history for supporting evidence",
          description:
            "Use when older decision history, reasons, conflicts, author-specific evidence, or broader historical lookup is needed. The response reports when only recent fallback history was available.",
          parameters: [
            {
              name: "query",
              in: "query",
              required: false,
              schema: { type: "string", maxLength: 1024 },
            },
            {
              name: "channelId",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
            {
              name: "authorId",
              in: "query",
              required: false,
              schema: { type: "string" },
            },
            {
              name: "after",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "before",
              in: "query",
              required: false,
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 25,
              },
            },
            {
              name: "sort",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["newest", "oldest", "relevance"],
                default: "newest",
              },
            },
          ],
          responses: {
            "200": {
              description: "Discord message search results",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResult" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API key",
        },
      },
      schemas: {
        Guild: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
        Channel: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
        BridgeAttachment: {
          type: "object",
          required: ["id", "name", "url", "contentType"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            url: { type: "string", format: "uri" },
            contentType: { type: ["string", "null"] },
          },
        },
        BridgeMessage: {
          type: "object",
          required: [
            "id",
            "source",
            "serverId",
            "serverName",
            "channelId",
            "channelName",
            "authorId",
            "authorName",
            "content",
            "timestamp",
            "attachments",
          ],
          properties: {
            id: { type: "string" },
            source: { type: "string", enum: ["discord"] },
            serverId: { type: "string" },
            serverName: { type: "string" },
            channelId: { type: "string" },
            channelName: { type: "string" },
            authorId: { type: "string" },
            authorName: { type: "string" },
            content: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            attachments: {
              type: "array",
              items: { $ref: "#/components/schemas/BridgeAttachment" },
            },
          },
        },
        TeamContextChannelSnapshot: {
          type: "object",
          required: [
            "channelId",
            "channelName",
            "fetchedMessages",
            "returnedMessages",
            "oldestFetchedAt",
            "newestFetchedAt",
            "windowComplete",
          ],
          properties: {
            channelId: { type: "string" },
            channelName: { type: "string" },
            fetchedMessages: { type: "integer", minimum: 0 },
            returnedMessages: { type: "integer", minimum: 0 },
            oldestFetchedAt: { type: ["string", "null"] },
            newestFetchedAt: { type: ["string", "null"] },
            windowComplete: { type: "boolean" },
          },
        },
        TeamContextSnapshot: {
          type: "object",
          required: [
            "snapshotAt",
            "source",
            "server",
            "scope",
            "freshness",
            "completeness",
            "channels",
            "authors",
            "messageCount",
            "messages",
          ],
          properties: {
            snapshotAt: { type: "string", format: "date-time" },
            source: { type: "string", enum: ["discord"] },
            server: {
              type: "object",
              required: ["id", "name"],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
            scope: {
              type: "object",
              required: ["since", "perChannelLimit", "channelCount"],
              properties: {
                since: { type: ["string", "null"] },
                perChannelLimit: { type: "integer" },
                channelCount: { type: "integer" },
              },
            },
            freshness: {
              type: "object",
              required: ["newestMessageAt"],
              properties: {
                newestMessageAt: { type: ["string", "null"] },
              },
            },
            completeness: {
              type: "object",
              required: ["historyComplete", "note"],
              properties: {
                historyComplete: { type: "boolean" },
                note: { type: "string" },
              },
            },
            channels: {
              type: "array",
              items: { $ref: "#/components/schemas/TeamContextChannelSnapshot" },
            },
            authors: {
              type: "array",
              items: {
                type: "object",
                required: ["authorId", "authorName"],
                properties: {
                  authorId: { type: "string" },
                  authorName: { type: "string" },
                },
              },
            },
            messageCount: { type: "integer", minimum: 0 },
            messages: {
              type: "array",
              items: { $ref: "#/components/schemas/BridgeMessage" },
            },
          },
        },
        WorkflowContract: {
          type: "object",
          description:
            "Shared workflow, output sections, evidence rules, and optional decision/task status vocabularies.",
          properties: {
            version: { type: "string" },
            purpose: { type: "string" },
            workflow: {
              type: "array",
              items: { type: "string" },
            },
            sections: {
              type: "array",
              items: { type: "string" },
            },
            decisionStatuses: {
              type: "array",
              items: { type: "string" },
            },
            taskStatuses: {
              type: "array",
              items: { type: "string" },
            },
            evidenceRules: {
              type: "array",
              items: { type: "string" },
            },
            searchWhen: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        TeamBriefContext: {
          type: "object",
          required: ["mode", "generatedAt", "snapshot", "contract"],
          properties: {
            mode: { type: "string", enum: ["team-brief"] },
            generatedAt: { type: "string", format: "date-time" },
            snapshot: { $ref: "#/components/schemas/TeamContextSnapshot" },
            contract: { $ref: "#/components/schemas/WorkflowContract" },
          },
        },
        TeamDeltaContext: {
          type: "object",
          required: ["mode", "generatedAt", "window", "snapshot", "contract"],
          properties: {
            mode: { type: "string", enum: ["delta-brief"] },
            generatedAt: { type: "string", format: "date-time" },
            window: {
              type: "object",
              required: ["since", "sinceDefaulted", "lookbackHours"],
              properties: {
                since: { type: "string", format: "date-time" },
                sinceDefaulted: { type: "boolean" },
                lookbackHours: { type: ["integer", "null"] },
              },
            },
            snapshot: { $ref: "#/components/schemas/TeamContextSnapshot" },
            contract: { $ref: "#/components/schemas/WorkflowContract" },
          },
        },
        SearchResult: {
          type: "object",
          required: [
            "totalResults",
            "returnedResults",
            "searchMode",
            "historyComplete",
            "scannedMessages",
            "messages",
          ],
          properties: {
            totalResults: { type: "integer", minimum: 0 },
            returnedResults: { type: "integer", minimum: 0 },
            searchMode: {
              type: "string",
              enum: ["discord-index", "recent-fallback"],
            },
            historyComplete: { type: "boolean" },
            scannedMessages: { type: ["integer", "null"] },
            messages: {
              type: "array",
              items: { $ref: "#/components/schemas/BridgeMessage" },
            },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string" },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Bearer API key is missing or invalid",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Discord channel not found or inaccessible",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  });
}
