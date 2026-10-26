import { authorizedGptReader } from "../../../src/gpt/actions-auth.js";
import { AccessDeniedError, ScopeSelectionError } from "../../../src/access/types.js";

function limitParameter(value: string | null): number {
  const parsed = value === null ? 50 : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const reader = await authorizedGptReader(request);
  if (reader instanceof Response) return reader;
  try {
    const params = new URL(request.url).searchParams;
    const parentChannelId = params.get("parentChannelId")?.trim();
    const threadId = params.get("threadId")?.trim();
    if (!parentChannelId || !threadId) {
      return Response.json({error:"parentChannelId and threadId are required."},{status:400});
    }
    const starter = params.get("includeStarter");
    if (starter !== null && starter !== "true" && starter !== "false") {
      return Response.json({error:"includeStarter must be true or false."},{status:400});
    }
    const result = await reader.threadMessages(threadId,parentChannelId,{
      serverId: params.get("serverId") ?? undefined,
      limit: limitParameter(params.get("limit")),
      before: params.get("before") ?? undefined,
      includeStarter: starter !== "false",
    });
    return Response.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(error) {
    if (error instanceof AccessDeniedError) {
      return Response.json({error:"Thread or parent channel not found or not accessible."},{status:404});
    }
    if (error instanceof ScopeSelectionError) {
      return Response.json({error:error.message},{status:400});
    }
    if (error instanceof Error &&
        (error.message.startsWith("limit must") || error.message.startsWith("before must"))) {
      return Response.json({error:error.message},{status:400});
    }
    // Discord may return 403/404 when permissions or thread membership changed since listing.
    const status=(error as {status?:number} | null)?.status;
    if (status===403 || status===404) {
      return Response.json({error:"Thread or parent channel not found or not accessible."},{status:404});
    }
    console.error("GPT Actions get thread messages failed",error);
    return Response.json({error:"Failed to get Discord thread messages."},{status:500});
  }
}
