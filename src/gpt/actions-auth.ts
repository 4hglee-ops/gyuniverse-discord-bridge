import { principalFromGptRequest } from "../access/identity.js";
import { configuredAccessStore } from "../access/store.js";
import { scopeForPrincipal } from "../access/scope.js";
import { createDiscordRestClient } from "../discord/rest-client.js";
import { ScopedDiscordReader } from "../access/discord-reader.js";

export async function authorizedGptReader(request: Request): Promise<ScopedDiscordReader | Response> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const guildName = process.env.DISCORD_GUILD_NAME?.trim();
  if (!token || !guildId || !guildName) {
    return Response.json({error:"GPT Actions server configuration is incomplete."},{status:500});
  }
  try {
    const store = configuredAccessStore();
    const principal = await principalFromGptRequest(request, store);
    if (!principal) {
      return Response.json({error:"Unauthorized"},{
        status:401,
        headers:{"WWW-Authenticate":'Bearer realm="gyuniverse-discord-actions"',"Cache-Control":"no-store"},
      });
    }
    const scope = await scopeForPrincipal(principal, store, guildId, guildName);
    return new ScopedDiscordReader(createDiscordRestClient(token),scope);
  } catch(error) {
    console.error("GPT Actions authorization unavailable",error);
    return Response.json({error:"Authorization unavailable"},{status:503});
  }
}

// Retained for legacy GPT state-only endpoints. New Discord read endpoints
// must use authorizedGptReader() rather than this synchronous guard.
import { timingSafeEqual } from "node:crypto";
export function requireGptActionsAuth(request: Request): Response | null {
  const key = process.env.GPT_ACTIONS_API_KEY?.trim();
  if (!key) return Response.json({error:"GPT Actions server configuration is incomplete."},{status:500});
  const left=Buffer.from(request.headers.get("authorization") ?? "");
  const right=Buffer.from("Bearer "+key);
  if(left.length!==right.length || !timingSafeEqual(left,right)) {
    return Response.json({error:"Unauthorized"},{status:401,headers:{"WWW-Authenticate":'Bearer realm="gyuniverse-discord-actions"',"Cache-Control":"no-store"}});
  }
  return null;
}
