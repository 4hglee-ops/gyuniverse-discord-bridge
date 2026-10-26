import { authorizedGptReader } from "../../../src/gpt/actions-auth.js";
import { AccessDeniedError, ScopeSelectionError } from "../../../src/access/types.js";

function limitParameter(value: string | null): number {
  const parsed = value === null ? 25 : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("archiveLimit must be an integer between 1 and 100.");
  }
  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const reader = await authorizedGptReader(request);
  if (reader instanceof Response) return reader;
  try {
    const params = new URL(request.url).searchParams;
    const channelId = params.get("channelId")?.trim();
    if (!channelId) return Response.json({error:"channelId is required."},{status:400});
    const status = params.get("status") ?? "all";
    if (!["active","archived","all"].includes(status)) {
      return Response.json({error:"status must be active, archived, or all."},{status:400});
    }
    const result = await reader.listThreads(channelId, {
      serverId: params.get("serverId") ?? undefined,
      status: status as "active" | "archived" | "all",
      archiveLimit: limitParameter(params.get("archiveLimit")),
      beforePublic: params.get("beforePublic") ?? undefined,
      beforePrivate: params.get("beforePrivate") ?? undefined,
    });
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    if (error instanceof AccessDeniedError) {
      return Response.json({error:"Channel or server not found or not accessible."},{status:404});
    }
    if (error instanceof ScopeSelectionError) {
      return Response.json({error:error.message},{status:400});
    }
    if (error instanceof Error && error.message.startsWith("archiveLimit must")) {
      return Response.json({error:error.message},{status:400});
    }
    console.error("GPT Actions list threads failed",error);
    return Response.json({error:"Failed to list Discord threads."},{status:500});
  }
}
