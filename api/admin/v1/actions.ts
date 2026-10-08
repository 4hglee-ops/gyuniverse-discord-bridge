import { createDiscordRestClient } from "../../../src/discord/rest-client.js";
import { adminStoreFromEnv, executeAdminAction, isAdminAuthorized } from "../../../src/admin/service.js";

export async function POST(request: Request): Promise<Response> {
  if (!isAdminAuthorized(request)) return Response.json({error:"Unauthorized"},{status:401});
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) return Response.json({error:"Discord Bot not configured"},{status:503});
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({error:"Invalid JSON"},{status:400}); }
  try {
    const result = await executeAdminAction(body,createDiscordRestClient(token),adminStoreFromEnv());
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    if (error instanceof Error && /^(Invalid |Unsupported action)/.test(error.message)) {
      return Response.json({error:error.message},{status:400});
    }
    console.error("Bridge admin action failed",error instanceof Error ? error.name : "unknown");
    return Response.json({error:"Admin action failed"},{status:503});
  }
}
