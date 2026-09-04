import { createMcpHandler } from "@modelcontextprotocol/server";

import { createDiscordRestClient } from "../src/discord/rest-client.js";
import { buildRestMcpServer } from "../src/mcp/build-rest-server.js";
import {
  bearerToken,
  OAUTH_SCOPE,
  publicBaseUrl,
  validOAuthAccessToken,
} from "../src/oauth/stateless.js";

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

  const presentedToken = bearerToken(request);
  if (!presentedToken) return unauthorized();

  const sharedSecretAccepted = presentedToken === sharedSecret;
  const oauthAccepted = sharedSecretAccepted ? false : await validOAuthAccessToken(presentedToken);

  if (!sharedSecretAccepted && !oauthAccepted) return unauthorized();

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
