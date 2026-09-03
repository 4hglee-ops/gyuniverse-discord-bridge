import { toBridgeMessageRest } from "../../../src/adapters/discord-rest-message-adapter.js";
import { listTextChannelsRest } from "../../../src/discord/rest-channels.js";
import {
  DiscordSearchIndexPendingError,
  searchGuildMessagesRest,
  type DiscordMessageSearchSort,
} from "../../../src/discord/rest-search.js";
import { requireGptActionsAuth } from "../../../src/gpt/actions-auth.js";
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
  const authError = requireGptActionsAuth(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim() || undefined;
    const channelId = url.searchParams.get("channelId")?.trim() || undefined;
    const authorId = url.searchParams.get("authorId")?.trim() || undefined;
    const after = url.searchParams.get("after")?.trim() || undefined;
    const before = url.searchParams.get("before")?.trim() || undefined;
    const limit = parseLimit(url.searchParams.get("limit"));
    const sort = parseSort(url.searchParams.get("sort"));

    const { rest, guildId, guildName } = createGptActionsContext();
    const channels = await listTextChannelsRest(rest, guildId);
    const channelById = new Map(
      channels.map((channel) => [channel.id, channel]),
    );

    if (channelId && !channelById.has(channelId)) {
      return Response.json(
        { error: "Channel was not found or is not accessible by the bot." },
        { status: 404 },
      );
    }

    const search = await searchGuildMessagesRest(rest, guildId, {
      content: query,
      channelIds: channelId
        ? [channelId]
        : channels.map((channel) => channel.id),
      authorIds: authorId ? [authorId] : undefined,
      after,
      before,
      limit,
      sort,
    });

    const messages = search.messages.flatMap((message) => {
      const channel = channelById.get(message.channel_id);
      if (!channel) return [];

      return [
        toBridgeMessageRest(message, {
          guildId,
          guildName,
          channelId: channel.id,
          channelName: channel.name,
        }),
      ];
    });

    return Response.json(
      {
        totalResults: search.totalResults,
        returnedResults: messages.length,
        messages,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
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
