import { listTextChannelsRest } from "../../../src/discord/rest-channels.js";
import { requireGptActionsAuth } from "../../../src/gpt/actions-auth.js";
import { createGptActionsContext } from "../../../src/gpt/actions-context.js";

export async function GET(request: Request): Promise<Response> {
  const authError = requireGptActionsAuth(request);
  if (authError) return authError;

  try {
    const { rest, guildId, guildName } = createGptActionsContext();
    const channels = await listTextChannelsRest(rest, guildId);

    return Response.json(
      {
        guild: {
          id: guildId,
          name: guildName,
        },
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("GPT Actions list channels failed", error);
    return Response.json(
      { error: "Failed to list Discord channels." },
      { status: 500 },
    );
  }
}
