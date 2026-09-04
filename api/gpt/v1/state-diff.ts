import {
  createTeamStateCheckpoint,
  diffTeamStates,
  readTeamStateCheckpoint,
  type NormalizedTeamState,
  type TeamStateCheckpointMetadata,
} from "../../../src/context/team-state-checkpoint.js";
import { requireGptActionsAuth } from "../../../src/gpt/actions-auth.js";

interface StateDiffRequestBody {
  previousCheckpointToken: string;
  currentState: NormalizedTeamState;
  currentMetadata: TeamStateCheckpointMetadata;
}

export async function POST(request: Request): Promise<Response> {
  const authError = requireGptActionsAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as StateDiffRequestBody;
    if (!body?.previousCheckpointToken || !body?.currentState || !body?.currentMetadata) {
      return Response.json(
        {
          error:
            "previousCheckpointToken, currentState, and currentMetadata are required.",
        },
        { status: 400 },
      );
    }

    const previous = readTeamStateCheckpoint(body.previousCheckpointToken);
    const current = createTeamStateCheckpoint(
      body.currentState,
      body.currentMetadata,
    );
    const diff = diffTeamStates(previous, current.checkpoint);

    return Response.json(
      {
        previousCheckpoint: previous,
        currentCheckpointToken: current.token,
        currentCheckpoint: current.checkpoint,
        diff,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Failed to compare team state checkpoint." },
      { status: 500 },
    );
  }
}
