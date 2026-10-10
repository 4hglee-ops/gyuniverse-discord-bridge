import { createMcpHandler } from "@modelcontextprotocol/server";
import { principalFromMcpRequest } from "../src/access/identity.js";
import { configuredAccessStore } from "../src/access/store.js";
import { scopeForPrincipal } from "../src/access/scope.js";
import { ScopedDiscordReader } from "../src/access/discord-reader.js";

import { createDiscordRestClient } from "../src/discord/rest-client.js";
import { buildRestMcpServer } from "../src/mcp/build-rest-server.js";
import { OAUTH_SCOPE, publicBaseUrl } from "../src/oauth/stateless.js";

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function unauthorized(): Response {
  const metadata = `${publicBaseUrl()}/.well-known/oauth-protected-resource`;
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer realm="gyuniverse-discord-bridge", resource_metadata="${metadata}", scope="${OAUTH_SCOPE}"`,
    },
  });
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

  let reader: ScopedDiscordReader;
  try {
    const store = configuredAccessStore();
    const principal = await principalFromMcpRequest(request, store);
    if (!principal) return unauthorized();
    const scope = await scopeForPrincipal(principal, store, guildId, guildName);
    const rest = createDiscordRestClient(token);
    reader = new ScopedDiscordReader(rest, scope);
  } catch (error) {
    console.error("MCP authorization failed", error);
    return new Response("Authorization unavailable", {status: 503});
  }

  const mcpHandler = createMcpHandler(() =>
    buildRestMcpServer({
      rest: reader.rest,
      guildId,
      guildName,
      reader,
    }),
  );

  return mcpHandler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
