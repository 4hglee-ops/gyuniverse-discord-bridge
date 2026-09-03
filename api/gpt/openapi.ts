export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Gyuniverse Discord GPT Actions",
      version: "1.0.0",
      description:
        "Read-only GPT Actions for listing Discord text channels and reading recent messages from the configured Gyuniverse Discord server.",
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
