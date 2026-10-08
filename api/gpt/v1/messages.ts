import { toBridgeMessageRest } from "../../../src/adapters/discord-rest-message-adapter.js";
import { listTextChannelsRest } from "../../../src/discord/rest-channels.js";
import { getRecentMessagesRest } from "../../../src/discord/rest-messages.js";
import { authorizedGptReader } from "../../../src/gpt/actions-auth.js";
import { createGptActionsContext } from "../../../src/gpt/actions-context.js";

function parseLimit(value: string | null): number {
  if (!value) return 20;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }

  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const reader = await authorizedGptReader(request);
  if (reader instanceof Response) return reader;

  try {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"));

    if (!channelId) {
      return Response.json(
        { error: "channelId is required." },
        { status: 400 },
      );
    }

    const messages = await reader.recentMessages(channelId, limit,
      url.searchParams.get("serverId") ?? undefined);
    const channel = { id: channelId, name: messages[0]?.channelName ?? channelId };
    return Response.json(
      {
        channel: {
          id: channel.id,
          name: channel.name,
        },
        messages,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("limit must")) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("GPT Actions get messages failed", error);
    return Response.json(
      { error: "Failed to get Discord messages." },
      { status: 500 },
    );
  }
}
