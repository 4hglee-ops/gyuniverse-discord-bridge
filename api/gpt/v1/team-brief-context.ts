import { createTeamBriefContext } from "../../../src/context/team-context-workflows.js";
import { requireGptActionsAuth } from "../../../src/gpt/actions-auth.js";
import { createGptActionsContext } from "../../../src/gpt/actions-context.js";

function parseChannelIds(value: string | null): string[] | undefined {
  if (!value) return undefined;

  const result = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (result.length === 0) return undefined;
  if (result.length > 20) {
    throw new Error("channelIds supports at most 20 channel IDs.");
  }

  return result;
}

function parsePerChannelLimit(value: string | null): number {
  if (!value) return 50;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(
      "perChannelLimit must be an integer between 1 and 100.",
    );
  }

  return parsed;
}

export async function GET(request: Request): Promise<Response> {
  const authError = requireGptActionsAuth(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const channelIds = parseChannelIds(url.searchParams.get("channelIds"));
    const since = url.searchParams.get("since")?.trim() || undefined;
    const perChannelLimit = parsePerChannelLimit(
      url.searchParams.get("perChannelLimit"),
    );

    const { rest, guildId, guildName } = createGptActionsContext();
    const result = await createTeamBriefContext({
      rest,
      guildId,
      guildName,
      channelIds,
      since,
      perChannelLimit,
    });

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.startsWith("channelIds supports") ||
        error.message.startsWith("perChannelLimit must") ||
        error.message.startsWith("since must") ||
        error.message.startsWith("Discord channels are not accessible")
      )
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("GPT Actions Team Brief context failed", error);
    return Response.json(
      { error: "Failed to create Team Brief context." },
      { status: 500 },
    );
  }
}
