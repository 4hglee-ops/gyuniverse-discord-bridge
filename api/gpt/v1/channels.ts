import { listTextChannelsRest } from "../../../src/discord/rest-channels.js";
import { authorizedGptReader } from "../../../src/gpt/actions-auth.js";
import { createGptActionsContext } from "../../../src/gpt/actions-context.js";

export async function GET(request: Request): Promise<Response> {
  const reader = await authorizedGptReader(request);
  if (reader instanceof Response) return reader;

  try {
    const requestedServer = new URL(request.url).searchParams.get("serverId") ?? undefined;
    const channels = await reader.listChannels(requestedServer);
    const guild = requestedServer
      ? reader.scope.guilds.find(g => g.id === requestedServer)
      : reader.scope.guilds[0];
    if (!guild || (reader.scope.guilds.length > 1 && !requestedServer)) {
      return Response.json({ error: "serverId is required or inaccessible." }, { status: 400 });
    }
    return Response.json(
      {
        guild: {
          id: guild.id,
          name: guild.name,
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
