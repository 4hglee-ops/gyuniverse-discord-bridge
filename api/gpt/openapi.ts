export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Gyuniverse Discord GPT Actions",
      version: "1.2.0",
      description:
        "Read-only GPT Actions for listing Discord channels, reading recent messages, searching history, and building a shared Team Context Snapshot for Team Brief and Decision Ledger workflows.",
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/gpt/v1/channels": {
        get: {
          operationId: "listDiscordChannels",
          summary: "List accessible Discord text channels",
          description:
            "Lists text channels that the configured Discord bot can access in the configured server.",
          responses: {
            "200": {
              description: "Accessible Discord channels",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["guild", "channels"],
                    properties: {
                      guild: {
                        type: "object",
                        required: ["id", "name"],
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                        },
                      },
                      channels: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["id", "name"],
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                          },
                        },
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
          summary: "Read recent messages from a Discord text channel",
          description:
            "Returns recent messages for an accessible Discord text channel. Call listDiscordChannels first when the channel ID is unknown.",
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
                      channel: {
                        type: "object",
                        required: ["id", "name"],
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                        },
                      },
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
          summary: "Build a shared Discord Team Context Snapshot",
          description:
            "Collects recent messages across multiple accessible Discord channels into one evidence-oriented snapshot with freshness and completeness metadata. Use this as the primary input for Team Brief, Decision Ledger, and Delta Brief. It does not itself infer decisions or completion states.",
          parameters: [
            {
              name: "channelIds",
              in: "query",
              required: false,
              description:
                "Comma-separated Discord channel IDs. Omit to include every accessible text channel. Maximum 20 channels.",
              schema: { type: "string" },
            },
            {
              name: "since",
              in: "query",
              required: false,
              description:
                "Only include messages at or after this time. ISO 8601 date-time recommended.",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "perChannelLimit",
              in: "query",
              required: false,
              description:
                "Maximum recent messages fetched per channel. Defaults to 50.",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 50,
              },
            },
          ],
          responses: {
            "200": {
              description: "Discord Team Context Snapshot",
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
      "/api/gpt/v1/search": {
        get: {
          operationId: "searchDiscordMessages",
          summary: "Search Discord message history",
          description:
            "Searches accessible text channels. If Discord historical search is unavailable, the bridge falls back to recent messages and reports the limitation.",
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
                  schema: {
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
                      scannedMessages: {
                        type: ["integer", "null"],
                        minimum: 0,
                      },
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
            oldestFetchedAt: { type: ["string", "null"], format: "date-time" },
            newestFetchedAt: { type: ["string", "null"], format: "date-time" },
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
                since: { type: ["string", "null"], format: "date-time" },
                perChannelLimit: { type: "integer", minimum: 1, maximum: 100 },
                channelCount: { type: "integer", minimum: 0 },
              },
            },
            freshness: {
              type: "object",
              required: ["newestMessageAt"],
              properties: {
                newestMessageAt: { type: ["string", "null"], format: "date-time" },
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
