export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Gyuniverse Discord GPT Actions",
      version: "1.1.0",
      description:
        "Read-only GPT Actions for listing Discord text channels, reading recent messages, and searching team Discord history in the configured Gyuniverse server.",
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
            "Returns recent messages in chronological order for an accessible Discord text channel. Call listDiscordChannels first when the channel ID is unknown.",
          parameters: [
            {
              name: "channelId",
              in: "query",
              required: true,
              description: "Discord text channel ID returned by listDiscordChannels.",
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Number of recent messages to return. Defaults to 20.",
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
      "/api/gpt/v1/search": {
        get: {
          operationId: "searchDiscordMessages",
          summary: "Search Discord message history",
          description:
            "Searches accessible text channels in the configured Discord server. Filters can be combined to recover past discussions, decisions, tasks, and evidence.",
          parameters: [
            {
              name: "query",
              in: "query",
              required: false,
              description: "Message content search text.",
              schema: { type: "string", maxLength: 1024 },
            },
            {
              name: "channelId",
              in: "query",
              required: false,
              description: "Optional Discord text channel ID returned by listDiscordChannels.",
              schema: { type: "string" },
            },
            {
              name: "authorId",
              in: "query",
              required: false,
              description: "Optional Discord user ID to filter by author.",
              schema: { type: "string" },
            },
            {
              name: "after",
              in: "query",
              required: false,
              description: "Only messages after this time. ISO 8601 date-time recommended.",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "before",
              in: "query",
              required: false,
              description: "Only messages before this time. ISO 8601 date-time recommended.",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Number of search results to return. Defaults to 25.",
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
              description: "Search result ordering.",
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
                    required: ["totalResults", "returnedResults", "messages"],
                    properties: {
                      totalResults: { type: "integer", minimum: 0 },
                      returnedResults: { type: "integer", minimum: 0 },
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
            "503": {
              description: "Discord search index is not ready yet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
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
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string" },
            retryAfterSeconds: { type: ["number", "null"] },
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
