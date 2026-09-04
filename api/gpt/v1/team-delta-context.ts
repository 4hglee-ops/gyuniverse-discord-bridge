import { createTeamDeltaContext } from "../../../src/context/team-context-workflows.js";
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

function parseInteger(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number,
  name: string,
): number {
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
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
    const lookbackHours = parseInteger(
      url.searchParams.get("lookbackHours"),
      24,
      1,
      168,
      "lookbackHours",
    );
    const perChannelLimit = parseInteger(
      url.searchParams.get("perChannelLimit"),
      50,
      1,
      100,
      "perChannelLimit",
    );

    const { rest, guildId, guildName } = createGptActionsContext();
    const result = await createTeamDeltaContext({
      rest,
      guildId,
      guildName,
      channelIds,
      since,
      lookbackHours,
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
        error.message.startsWith("lookbackHours must") ||
        error.message.startsWith("perChannelLimit must") ||
        error.message.startsWith("since must") ||
        error.message.startsWith("Discord channels are not accessible")
      )
    ) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error("GPT Actions Delta Brief context failed", error);
    return Response.json(
      { error: "Failed to create Delta Brief context." },
      { status: 500 },
    );
  }
}
