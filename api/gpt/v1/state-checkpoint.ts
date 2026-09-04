import {
  createTeamStateCheckpoint,
  type NormalizedTeamState,
  type TeamStateCheckpointMetadata,
} from "../../../src/context/team-state-checkpoint.js";
import { requireGptActionsAuth } from "../../../src/gpt/actions-auth.js";

interface CheckpointRequestBody {
  state: NormalizedTeamState;
  metadata: TeamStateCheckpointMetadata;
}

export async function POST(request: Request): Promise<Response> {
  const authError = requireGptActionsAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as CheckpointRequestBody;
    if (!body?.state || !body?.metadata) {
      return Response.json(
        { error: "state and metadata are required." },
        { status: 400 },
      );
    }

    const result = createTeamStateCheckpoint(body.state, body.metadata);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Failed to create team state checkpoint." },
      { status: 500 },
    );
  }
}
