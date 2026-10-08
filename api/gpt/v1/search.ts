import { toBridgeMessageRest } from "../../../src/adapters/discord-rest-message-adapter.js";
import { listTextChannelsRest } from "../../../src/discord/rest-channels.js";
import {
  DiscordSearchIndexPendingError,
  searchGuildMessagesRest,
  type DiscordMessageSearchSort,
} from "../../../src/discord/rest-search.js";
import { authorizedGptReader } from "../../../src/gpt/actions-auth.js";
import { createGptActionsContext } from "../../../src/gpt/actions-context.js";

function parseLimit(value: string | null): number {
  if (!value) return 25;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }

  return parsed;
}

function parseSort(value: string | null): DiscordMessageSearchSort {
  if (!value) return "newest";

  if (value === "newest" || value === "oldest" || value === "relevance") {
    return value;
  }

  throw new Error("sort must be newest, oldest, or relevance.");
}

export async function GET(request: Request): Promise<Response> {
  const reader = await authorizedGptReader(request);
  if (reader instanceof Response) return reader;

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() || undefined;
    const channelId = url.searchParams.get("channelId")?.trim() || undefined;
    const authorId = url.searchParams.get("authorId")?.trim() || undefined;
    const after = url.searchParams.get("after")?.trim() || undefined;
    const before = url.searchParams.get("before")?.trim() || undefined;
    const limit = parseLimit(url.searchParams.get("limit"));
    const sort = parseSort(url.searchParams.get("sort"));

    const result = await reader.search({
      query, channelId, authorId, after, before, limit, sort,
      serverId: url.searchParams.get("serverId") ?? undefined,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DiscordSearchIndexPendingError) {
      return Response.json(
        {
          error: "Discord search index is not ready yet.",
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 503 },
      );
    }

    if (
      error instanceof Error &&
      (error.message.startsWith("limit must") ||
        error.message.startsWith("sort must") ||
        error.message.startsWith("content must") ||
        error.message.startsWith("after must") ||
        error.message.startsWith("before must"))
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("GPT Actions search messages failed", error);
    return Response.json(
      { error: "Failed to search Discord messages." },
      { status: 500 },
    );
  }
}
