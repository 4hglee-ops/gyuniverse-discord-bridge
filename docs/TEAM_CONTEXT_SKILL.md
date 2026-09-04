# Gyuniverse Team Context Skill

기준일: 2026-09-04

이 문서는 ChatGPT GPTs와 Claude가 동일한 방식으로 Discord Team Context를 읽고 Team Brief / Delta Brief / Decision Ledger를 생성하기 위한 공통 실행 규약이다.

## 1. Source / Tool 우선순위

Discord 질문은 추측하지 않고 실제 Bridge 도구를 사용한다.

### 현재 팀 상태

```text
get_team_brief_context
// GPT Actions: getTeamBriefContext
```

결과:

```text
Decision Baseline
Current Discord Snapshot
Team Brief Contract
```

### 현재 결정 / 결정 변경 여부

```text
get_decision_ledger_context
// GPT Actions: getDecisionLedgerContext
```

### 무엇이 바뀌었는지

```text
get_team_delta_context
// GPT Actions: getTeamDeltaContext
```

이전 Team State Checkpoint가 있으면 시간창 메시지 요약보다 checkpoint diff를 우선한다.

### Team State Checkpoint 생성

```text
create_team_state_checkpoint
// GPT Actions: createTeamStateCheckpoint
```

### 이전 Checkpoint와 현재 상태 비교

```text
compare_team_state_checkpoint
// GPT Actions: compareTeamStateCheckpoint
```

### 원본 Evidence Pack

```text
get_team_context_snapshot
// GPT Actions: getTeamContextSnapshot
```

### 특정 과거 사실/결정

```text
search_discord_messages
// GPT Actions: searchDiscordMessages
```

---

## 2. Evidence 규칙

- `얘기했다` ≠ `결정했다`
- `해야 한다` ≠ `내가 한다`
- `하겠다` ≠ `완료했다`
- `자료를 공유했다` ≠ `전체 작업 완료`
- 역할상 관련 있어 보임 ≠ 실제 담당자로 배정됨
- 한 사람의 아이디어 ≠ 팀 결정
- 최신 메시지 ≠ 자동으로 최신 confirmed decision
- Discord username ≠ 실제 사람 이름
- 최근 Snapshot에서 언급되지 않음 ≠ 기존 confirmed decision 취소
- 새 메시지 1건 ≠ 기존 confirmed decision superseded

Inferred Evidence만으로 사람/완료/결정을 확정하지 않는다.

---

## 3. Decision Baseline

Decision Baseline은 이미 검증된 confirmed decision의 지속 기준이다.

```text
confirmed
→ 명시적 superseded/rejected 근거 전까지 유지
```

Source of Truth:

```text
src/context/decision-baseline.ts
docs/DECISION_BASELINE.md
```

Baseline에는 `currentDecisions`와 `openDecisions`가 분리되어 있다.

Baseline과 최신 Snapshot이 충돌하면 필요한 Topic만 Search로 확인하고, 충분한 근거가 있을 때만 기존 결정을 변경한다.

---

## 4. Team Brief v2.2

판정 순서:

```text
Decision Baseline
→ Current Discord Snapshot
→ 필요한 Topic만 Search
→ Team Brief
```

기본 출력:

1. Current Decisions
2. What Changed
3. In Progress
4. Assigned Work
5. Unassigned Work
6. Blockers
7. Risks
8. Unresolved Questions
9. Proposals
10. Decisions Needed Next
11. State Gaps
12. Evidence / Freshness

반복 비교가 필요하면 현재 판정 결과를 아래 5개 category로 정규화한다.

```text
decisions
work
blockers
questions
proposals
```

각 항목은 stable `id`, `status`, `summary`, `evidenceIds`를 가진다.

---

## 5. Delta Brief v2

### 이전 checkpoint가 있는 경우

```text
Previous checkpoint token
        +
Current Snapshot / Baseline
        ↓
현재 상태 정규화
        ↓
compare_team_state_checkpoint
        ↓
Deterministic State Diff
```

서버 diff 종류:

```text
added
removed
status_changed
content_changed
```

이를 사람이 읽는 Delta 섹션으로 번역한다.

예:

```text
decision proposed → confirmed
work in_progress → completion_candidate
blocker open → resolved
question open → answered
```

비교 후 반환된 `currentCheckpointToken`을 다음 비교에 사용한다.

### 이전 checkpoint가 없는 경우

기존처럼 지정 시간 범위의 Snapshot을 보고 보수적으로 Delta를 판정한다.

기본 출력:

1. New Decisions
2. Changed Decisions
3. New Tasks
4. Progress Changes
5. Completion Candidates
6. New Blockers
7. Resolved Blockers
8. New Questions
9. Resolved Questions
10. New Proposals
11. Evidence / Freshness

---

## 6. Team State Checkpoint

Checkpoint는 AI가 이미 해석한 상태를 Bridge가 서명해 보존하는 기능이다.

Bridge는 상태 의미를 새로 판단하지 않는다.

Checkpoint metadata:

```text
snapshotAt
baselineVersion
historyComplete
newestMessageAt
```

서명은 `MCP_OAUTH_SIGNING_SECRET`, 없으면 `MCP_SHARED_SECRET`을 사용한다.

중요:

- token은 변조 탐지용
- token payload는 암호화되지 않음
- password / API key / OAuth token 같은 secret을 state에 넣지 않음
- v1은 DB에 저장하지 않으므로 클라이언트/대화가 token을 보존해야 함

상세:

```text
docs/TEAM_STATE_CHECKPOINTS.md
```

---

## 7. Decision Ledger

Decision 요청은 `get_decision_ledger_context`를 우선 사용한다.

Decision 상태:

```text
confirmed
proposed
superseded
rejected
unclear
```

`confirmed decision`과 `implementation done`은 별개다.

---

## 8. Search 보완 조건

Snapshot/Baseline만으로 충분하면 Search하지 않는다.

다음 경우만 Search를 보완한다.

- 결정 이유/변경 이력이 필요함
- Baseline과 최신 메시지가 충돌함
- 기존 결정을 superseded/rejected 할 가능성이 있음
- 완료/담당 Evidence가 부족함
- 사용자가 과거 전체를 요구함

---

## 9. Completeness / Freshness

`historyComplete=false`이면 최근 조회 범위 기준임을 반드시 표시한다.

`historyComplete=true`는 지정된 `since` 경계까지 각 Discord 채널을 충분히 확인했다는 의미이며, Notion/Jira/GitHub까지 완전하다는 뜻은 아니다.

---

## 10. Tool 선택 요약

```text
현재 팀 상황
→ get_team_brief_context

현재 결정 / 결정 변경
→ get_decision_ledger_context

어제/회의 이후 변화
→ get_team_delta_context

첫 상태 저장
→ create_team_state_checkpoint

이전 상태와 실제 비교
→ compare_team_state_checkpoint

원본 메시지 묶음
→ get_team_context_snapshot

과거 특정 결정/근거
→ search_discord_messages
```

---

## 11. Write 원칙

Team State Checkpoint는 Bridge 내부 팀 상태 비교용이며 외부 업무 시스템 write가 아니다.

- Discord write/delete 없음
- Jira/Notion/GitHub 변경은 먼저 후보 제시
- 실제 write는 사용자의 명시적 실행 요청 후 수행
- delete/bulk destructive 변경은 별도 강한 승인 필요
