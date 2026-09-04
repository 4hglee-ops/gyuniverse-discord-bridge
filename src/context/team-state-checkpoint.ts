import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export type TeamStateCategory =
  | "decisions"
  | "work"
  | "blockers"
  | "questions"
  | "proposals";

export interface TeamStateItem {
  id: string;
  status: string;
  summary: string;
  evidenceIds: string[];
}

export interface NormalizedTeamState {
  decisions: TeamStateItem[];
  work: TeamStateItem[];
  blockers: TeamStateItem[];
  questions: TeamStateItem[];
  proposals: TeamStateItem[];
}

export interface TeamStateCheckpointMetadata {
  snapshotAt: string;
  baselineVersion: string;
  historyComplete: boolean;
  newestMessageAt: string | null;
}

export interface TeamStateCheckpointPayload {
  version: "1";
  createdAt: string;
  metadata: TeamStateCheckpointMetadata;
  state: NormalizedTeamState;
}

export type TeamStateDiffKind =
  | "added"
  | "removed"
  | "status_changed"
  | "content_changed";

export interface TeamStateDiffEntry {
  category: TeamStateCategory;
  id: string;
  kind: TeamStateDiffKind;
  before: TeamStateItem | null;
  after: TeamStateItem | null;
}

export interface TeamStateDiffResult {
  from: TeamStateCheckpointMetadata;
  to: TeamStateCheckpointMetadata;
  changes: TeamStateDiffEntry[];
  counts: {
    added: number;
    removed: number;
    statusChanged: number;
    contentChanged: number;
    total: number;
  };
}

const CHECKPOINT_PREFIX = "gycp1";
const CATEGORIES: TeamStateCategory[] = [
  "decisions",
  "work",
  "blockers",
  "questions",
  "proposals",
];

function checkpointSecret(): string {
  const value =
    process.env.MCP_OAUTH_SIGNING_SECRET?.trim() ||
    process.env.MCP_SHARED_SECRET?.trim();

  if (!value) {
    throw new Error(
      "Team state checkpoint signing requires MCP_OAUTH_SIGNING_SECRET or MCP_SHARED_SECRET.",
    );
  }

  return value;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(body: string): string {
  return createHmac("sha256", checkpointSecret())
    .update(body)
    .digest("base64url");
}

function validateItem(item: TeamStateItem, category: TeamStateCategory): void {
  if (!item.id?.trim()) throw new Error(`${category} item id is required.`);
  if (!item.status?.trim()) throw new Error(`${category} item status is required.`);
  if (!item.summary?.trim()) throw new Error(`${category} item summary is required.`);
  if (!Array.isArray(item.evidenceIds)) {
    throw new Error(`${category} item evidenceIds must be an array.`);
  }
}

export function validateNormalizedTeamState(state: NormalizedTeamState): void {
  for (const category of CATEGORIES) {
    const items = state[category];
    if (!Array.isArray(items)) {
      throw new Error(`${category} must be an array.`);
    }

    const ids = new Set<string>();
    for (const item of items) {
      validateItem(item, category);
      if (ids.has(item.id)) {
        throw new Error(`Duplicate ${category} item id: ${item.id}`);
      }
      ids.add(item.id);
    }
  }
}

export function createTeamStateCheckpoint(
  state: NormalizedTeamState,
  metadata: TeamStateCheckpointMetadata,
): {
  token: string;
  checkpoint: TeamStateCheckpointPayload;
} {
  validateNormalizedTeamState(state);

  if (Number.isNaN(Date.parse(metadata.snapshotAt))) {
    throw new Error("metadata.snapshotAt must be a valid date-time.");
  }

  const checkpoint: TeamStateCheckpointPayload = {
    version: "1",
    createdAt: new Date().toISOString(),
    metadata,
    state,
  };

  const encoded = encodeBase64Url(JSON.stringify(checkpoint));
  const body = `${CHECKPOINT_PREFIX}.${encoded}`;
  const signature = sign(body);

  return {
    token: `${body}.${signature}`,
    checkpoint,
  };
}

export function readTeamStateCheckpoint(
  token: string,
): TeamStateCheckpointPayload {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== CHECKPOINT_PREFIX) {
    throw new Error("Invalid team state checkpoint token format.");
  }

  const body = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(parts[2]);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new Error("Invalid team state checkpoint signature.");
  }

  let checkpoint: TeamStateCheckpointPayload;
  try {
    checkpoint = JSON.parse(decodeBase64Url(parts[1])) as TeamStateCheckpointPayload;
  } catch {
    throw new Error("Invalid team state checkpoint payload.");
  }

  if (checkpoint.version !== "1") {
    throw new Error(`Unsupported team state checkpoint version: ${checkpoint.version}`);
  }

  validateNormalizedTeamState(checkpoint.state);
  return checkpoint;
}

function itemChanged(a: TeamStateItem, b: TeamStateItem): boolean {
  if (a.summary !== b.summary) return true;

  const aEvidence = [...a.evidenceIds].sort();
  const bEvidence = [...b.evidenceIds].sort();
  return JSON.stringify(aEvidence) !== JSON.stringify(bEvidence);
}

export function diffTeamStates(
  before: TeamStateCheckpointPayload,
  after: TeamStateCheckpointPayload,
): TeamStateDiffResult {
  const changes: TeamStateDiffEntry[] = [];

  for (const category of CATEGORIES) {
    const beforeById = new Map(before.state[category].map((item) => [item.id, item]));
    const afterById = new Map(after.state[category].map((item) => [item.id, item]));
    const ids = new Set([...beforeById.keys(), ...afterById.keys()]);

    for (const id of [...ids].sort()) {
      const previous = beforeById.get(id) ?? null;
      const current = afterById.get(id) ?? null;

      if (!previous && current) {
        changes.push({ category, id, kind: "added", before: null, after: current });
        continue;
      }

      if (previous && !current) {
        changes.push({ category, id, kind: "removed", before: previous, after: null });
        continue;
      }

      if (!previous || !current) continue;

      if (previous.status !== current.status) {
        changes.push({
          category,
          id,
          kind: "status_changed",
          before: previous,
          after: current,
        });
        continue;
      }

      if (itemChanged(previous, current)) {
        changes.push({
          category,
          id,
          kind: "content_changed",
          before: previous,
          after: current,
        });
      }
    }
  }

  const counts = {
    added: changes.filter((change) => change.kind === "added").length,
    removed: changes.filter((change) => change.kind === "removed").length,
    statusChanged: changes.filter((change) => change.kind === "status_changed").length,
    contentChanged: changes.filter((change) => change.kind === "content_changed").length,
    total: changes.length,
  };

  return {
    from: before.metadata,
    to: after.metadata,
    changes,
    counts,
  };
}
