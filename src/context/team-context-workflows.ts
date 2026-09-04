import type { REST } from "discord.js";

import {
  createTeamContextSnapshot,
  type TeamContextSnapshot,
} from "./team-context-snapshot.js";

const evidenceRules = [
  "얘기했다 ≠ 결정했다. 한 사람의 제안만으로 팀 결정을 확정하지 않는다.",
  "하겠다 ≠ 완료했다. 완료 언급은 결과물 또는 강한 완료 근거가 있을 때만 done으로 올린다.",
  "역할분담 ≠ 실제 Assignee. 명시적 배정 또는 검증된 계정 연결 없이 담당자를 확정하지 않는다.",
  "Discord username과 실제 사람 이름은 검증된 Identity Map이 없으면 자동 연결하지 않는다.",
  "현재 상태와 과거 이력을 분리한다. 최신 메시지라는 이유만으로 이전 확정 결정을 덮어쓰지 않는다.",
  "snapshot.completeness.historyComplete=false이면 조회 범위 제한을 답변에 명시한다.",
] as const;

const searchWhen = [
  "Snapshot 이전의 결정 이유나 변경 이력이 필요할 때",
  "같은 주제의 상충 메시지가 있어 최신 결정만으로 판정하기 어려울 때",
  "완료/담당/결정의 Evidence가 Snapshot 안에서 부족할 때",
  "사용자가 과거 전체, 특정 작성자, 특정 기간, 특정 키워드의 근거를 요구할 때",
] as const;

export const TEAM_BRIEF_CONTRACT = {
  version: "2.0",
  workflow: [
    "Snapshot을 현재 팀 상태의 1차 Evidence Pack으로 사용한다.",
    "필요한 과거 Topic만 search_discord_messages로 보완한다.",
    "메시지를 Decision / Work / Blocker / Risk / Question / Proposal / State Gap으로 분류한다.",
    "근거가 부족한 항목은 확인 필요 또는 후보로 유지한다.",
    "최종 답변 마지막에 Source freshness와 completeness를 짧게 표시한다.",
  ],
  sections: [
    "currentDecisions",
    "whatChanged",
    "inProgress",
    "assignedWork",
    "unassignedWork",
    "blockers",
    "risks",
    "unresolvedQuestions",
    "proposals",
    "decisionsNeededNext",
    "stateGaps",
    "evidenceFreshness",
  ],
  decisionStatuses: [
    "confirmed",
    "proposed",
    "superseded",
    "rejected",
    "unclear",
  ],
  taskStatuses: [
    "candidate",
    "assigned",
    "in_progress",
    "completion_candidate",
    "done",
    "blocked",
    "cancelled",
  ],
  evidenceRules,
  searchWhen,
} as const;

export const DELTA_BRIEF_CONTRACT = {
  version: "1.0",
  purpose:
    "기준 시각 이후 새로 생기거나 상태가 바뀐 팀 맥락만 압축한다. 전체 Team Brief를 반복하지 않는다.",
  workflow: [
    "Delta window Snapshot을 우선 읽는다.",
    "새 메시지가 이전 상태의 해결/변경을 언급하지만 기존 상태가 필요하면 search_discord_messages로 이전 Evidence를 찾는다.",
    "변화가 없는 섹션은 생략하거나 없음으로 짧게 표시한다.",
    "완료/결정/담당 변화는 Evidence가 충분한 경우만 승격한다.",
  ],
  sections: [
    "newDecisions",
    "changedDecisions",
    "newTasks",
    "progressChanges",
    "completionCandidates",
    "newBlockers",
    "resolvedBlockers",
    "newQuestions",
    "resolvedQuestions",
    "newProposals",
    "evidenceFreshness",
  ],
  evidenceRules,
  searchWhen,
} as const;

export interface TeamBriefContextOptions {
  rest: REST;
  guildId: string;
  guildName: string;
  channelIds?: string[];
  since?: string;
  perChannelLimit?: number;
}

export interface TeamBriefContext {
  mode: "team-brief";
  generatedAt: string;
  snapshot: TeamContextSnapshot;
  contract: typeof TEAM_BRIEF_CONTRACT;
}

export async function createTeamBriefContext(
  options: TeamBriefContextOptions,
): Promise<TeamBriefContext> {
  const snapshot = await createTeamContextSnapshot(options);

  return {
    mode: "team-brief",
    generatedAt: new Date().toISOString(),
    snapshot,
    contract: TEAM_BRIEF_CONTRACT,
  };
}

export interface TeamDeltaContextOptions {
  rest: REST;
  guildId: string;
  guildName: string;
  channelIds?: string[];
  since?: string;
  lookbackHours?: number;
  perChannelLimit?: number;
}

export interface TeamDeltaContext {
  mode: "delta-brief";
  generatedAt: string;
  window: {
    since: string;
    sinceDefaulted: boolean;
    lookbackHours: number | null;
  };
  snapshot: TeamContextSnapshot;
  contract: typeof DELTA_BRIEF_CONTRACT;
}

export async function createTeamDeltaContext(
  options: TeamDeltaContextOptions,
): Promise<TeamDeltaContext> {
  const {
    lookbackHours = 24,
    since,
    ...snapshotOptions
  } = options;

  if (
    !Number.isInteger(lookbackHours) ||
    lookbackHours < 1 ||
    lookbackHours > 168
  ) {
    throw new Error("lookbackHours must be an integer between 1 and 168.");
  }

  const resolvedSince = since ?? new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000,
  ).toISOString();

  if (Number.isNaN(Date.parse(resolvedSince))) {
    throw new Error(`since must be a valid date-time: ${resolvedSince}`);
  }

  const snapshot = await createTeamContextSnapshot({
    ...snapshotOptions,
    since: resolvedSince,
  });

  return {
    mode: "delta-brief",
    generatedAt: new Date().toISOString(),
    window: {
      since: resolvedSince,
      sinceDefaulted: since === undefined,
      lookbackHours: since === undefined ? lookbackHours : null,
    },
    snapshot,
    contract: DELTA_BRIEF_CONTRACT,
  };
}
