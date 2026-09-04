import type { REST } from "discord.js";

import {
  createTeamContextSnapshot,
  type TeamContextSnapshot,
} from "./team-context-snapshot.js";
import {
  DECISION_BASELINE,
  type DecisionBaseline,
} from "./decision-baseline.js";

const evidenceRules = [
  "얘기했다 ≠ 결정했다. 한 사람의 제안만으로 팀 결정을 확정하지 않는다.",
  "하겠다 ≠ 완료했다. 완료 언급은 결과물 또는 강한 완료 근거가 있을 때만 done으로 올린다.",
  "역할분담 ≠ 실제 Assignee. 명시적 배정 또는 검증된 계정 연결 없이 담당자를 확정하지 않는다.",
  "Discord username과 실제 사람 이름은 검증된 Identity Map이 없으면 자동 연결하지 않는다.",
  "현재 상태와 과거 이력을 분리한다. 최신 메시지라는 이유만으로 이전 확정 결정을 덮어쓰지 않는다.",
  "Decision Baseline의 confirmed 결정은 명시적 superseded/rejected 근거가 생기기 전까지 현재 결정으로 유지한다.",
  "최근 Snapshot에 결정이 다시 언급되지 않았다는 이유만으로 Baseline에서 제거하지 않는다.",
  "snapshot.completeness.historyComplete=false이면 조회 범위 제한을 답변에 명시한다.",
] as const;

const searchWhen = [
  "Snapshot 이전의 결정 이유나 변경 이력이 필요할 때",
  "같은 주제의 상충 메시지가 있어 최신 결정만으로 판정하기 어려울 때",
  "Baseline 결정이 superseded/rejected 되었을 가능성이 보이지만 현재 Snapshot만으로 확정할 수 없을 때",
  "완료/담당/결정의 Evidence가 Snapshot 안에서 부족할 때",
  "사용자가 과거 전체, 특정 작성자, 특정 기간, 특정 키워드의 근거를 요구할 때",
] as const;

export const TEAM_BRIEF_CONTRACT = {
  version: "2.1",
  workflow: [
    "Decision Baseline의 confirmed 결정을 Current Decisions의 지속 기준으로 먼저 읽는다.",
    "Snapshot을 현재 팀 상태와 최근 변화의 1차 Evidence Pack으로 사용한다.",
    "Baseline과 Snapshot이 충돌하면 최신 메시지만으로 덮어쓰지 말고 필요한 Topic만 search_discord_messages로 보완한다.",
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
  version: "1.1",
  purpose:
    "기준 시각 이후 새로 생기거나 상태가 바뀐 팀 맥락만 압축한다. 전체 Team Brief를 반복하지 않는다.",
  workflow: [
    "Delta window Snapshot을 우선 읽는다.",
    "Decision Baseline은 변화 전 기준값으로 사용하되, Baseline 자체를 Delta의 새 결정으로 반복하지 않는다.",
    "새 메시지가 기존 confirmed 결정을 변경/대체하는 것처럼 보이면 필요한 과거 Evidence를 검색한 뒤 changedDecisions로 분류한다.",
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

export const DECISION_LEDGER_CONTRACT = {
  version: "1.0",
  purpose:
    "지속되는 confirmed 결정과 아직 열린 제안을 분리하고, 최신 Discord Evidence가 기존 결정을 변경했는지 검토한다.",
  workflow: [
    "Decision Baseline의 currentDecisions를 현재값으로 시작한다.",
    "Snapshot에서 각 Topic의 새로운 제안, 확인, 충돌, 대체 신호를 찾는다.",
    "단순 재언급은 새 결정으로 만들지 않는다.",
    "기존 confirmed 결정의 변경 가능성이 있으면 search_discord_messages로 과거/최신 맥락을 확인한다.",
    "명시적 대체/철회 근거가 충분할 때만 superseded/rejected 후보로 표시한다.",
    "openDecisions는 confirmed 근거가 생기기 전까지 proposed/unclear로 유지한다.",
  ],
  sections: [
    "currentDecisions",
    "decisionChanges",
    "openDecisions",
    "conflictsOrUnclear",
    "evidenceFreshness",
  ],
  decisionStatuses: [
    "confirmed",
    "proposed",
    "superseded",
    "rejected",
    "unclear",
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
  decisionBaseline: DecisionBaseline;
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
    decisionBaseline: DECISION_BASELINE,
    snapshot,
    contract: TEAM_BRIEF_CONTRACT,
  };
}

export interface DecisionLedgerContextOptions extends TeamBriefContextOptions {}

export interface DecisionLedgerContext {
  mode: "decision-ledger";
  generatedAt: string;
  baseline: DecisionBaseline;
  snapshot: TeamContextSnapshot;
  contract: typeof DECISION_LEDGER_CONTRACT;
}

export async function createDecisionLedgerContext(
  options: DecisionLedgerContextOptions,
): Promise<DecisionLedgerContext> {
  const snapshot = await createTeamContextSnapshot(options);

  return {
    mode: "decision-ledger",
    generatedAt: new Date().toISOString(),
    baseline: DECISION_BASELINE,
    snapshot,
    contract: DECISION_LEDGER_CONTRACT,
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
  decisionBaseline: DecisionBaseline;
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
    decisionBaseline: DECISION_BASELINE,
    window: {
      since: resolvedSince,
      sinceDefaulted: since === undefined,
      lookbackHours: since === undefined ? lookbackHours : null,
    },
    snapshot,
    contract: DELTA_BRIEF_CONTRACT,
  };
}
