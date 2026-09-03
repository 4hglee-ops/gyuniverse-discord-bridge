import { createMcpHandler } from "@modelcontextprotocol/server";

import { createDiscordRestClient } from "../src/discord/rest-client.js";
import { buildRestMcpServer } from "../src/mcp/build-rest-server.js";

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function handle(request: Request): Promise<Response> {
  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const guildId = requiredEnv("DISCORD_GUILD_ID");
  const guildName = requiredEnv("DISCORD_GUILD_NAME");
  const sharedSecret = requiredEnv("MCP_SHARED_SECRET");

  if (!token || !guildId || !guildName || !sharedSecret) {
    return new Response("Server configuration is incomplete", {
      status: 500,
    });
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${sharedSecret}`) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="gyuniverse-discord-bridge"',
      },
    });
  }

  const rest = createDiscordRestClient(token);
  const mcpHandler = createMcpHandler(() =>
    buildRestMcpServer({
      rest,
      guildId,
      guildName,
    }),
  );

  return mcpHandler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
