# Gyuniverse Team Context Skill

기준일: 2026-09-04

이 문서는 ChatGPT GPTs와 Claude가 동일한 방식으로 Discord Team Context를 읽고 Team Brief / Delta Brief / Decision Ledger를 생성하기 위한 공통 실행 규약이다.

## 1. Source 우선순위

Discord 질문은 추측하지 않고 실제 Bridge 도구를 사용한다.

### 현재 팀 상태 / 브리핑

우선:

```text
get_team_brief_context
// GPT Actions: getTeamBriefContext
```

이 결과에는 다음이 함께 들어간다.

```text
Decision Baseline
Current Discord Snapshot
Team Brief Contract
```

최근 Discord에 결정이 다시 언급되지 않아도 Baseline의 confirmed decision은 유지한다.

### 현재 결정 / 결정 변경 여부

우선:

```text
get_decision_ledger_context
// GPT Actions: getDecisionLedgerContext
```

다음 질문에 사용한다.

- 지금 확정된 결정 뭐야?
- DB 관련 결정은 아직 열린 상태야?
- 기존 결정에서 바뀐 거 있어?
- Jira→Branch→PR 흐름은 현재도 유효해?

### 무엇이 바뀌었는지

우선:

```text
get_team_delta_context
// GPT Actions: getTeamDeltaContext
```

사용 예:

- 어제 이후 뭐 바뀌었어?
- 오늘 새로 결정된 거 있어?
- 회의 이후 진행 상황만 알려줘.
- 지난 12시간 새 Blocker 있어?

### 원본 Evidence Pack만 필요한 경우

```text
get_team_context_snapshot
// GPT Actions: getTeamContextSnapshot
```

### 특정 과거 사실/결정 찾기

```text
search_discord_messages
```

---

## 2. Evidence 규칙

반드시 아래를 지킨다.

- `얘기했다` ≠ `결정했다`
- `해야 한다` ≠ `내가 한다`
- `하겠다` ≠ `완료했다`
- `자료를 공유했다` ≠ `전체 작업이 완료됐다`
- 역할상 관련 있어 보임 ≠ 실제 담당자로 배정됨
- 한 사람의 아이디어 ≠ 팀 결정
- 최신 메시지 ≠ 자동으로 최신 confirmed decision
- Discord username ≠ 실제 사람 이름 (검증된 Identity Map 필요)
- 최근 Snapshot에서 언급되지 않음 ≠ 기존 confirmed decision 취소
- 새 메시지 1건 ≠ 기존 confirmed decision superseded

### Evidence 수준

**Primary**
- 당사자 직접 진행/완료/담당 확인
- 실제 결과물 링크/파일/PR/화면
- 명시적인 팀 합의

**Secondary**
- 회의록 요약
- 팀장/다른 팀원의 현황 요약

**Inferred**
- 역할상 담당으로 보임
- 이름이 비슷함
- 링크 공유만으로 완료처럼 보임

Inferred Evidence만으로 사람/완료/결정을 확정하지 않는다.

---

## 3. Decision Baseline

Decision Baseline은 이미 검증된 confirmed decision의 지속 기준이다.

```text
confirmed
→ 명시적 superseded/rejected 근거 전까지 유지
```

현재 코드 Source of Truth:

```text
src/context/decision-baseline.ts
```

상세:

```text
docs/DECISION_BASELINE.md
```

Baseline에는 `currentDecisions`와 `openDecisions`가 분리되어 있다.

### 중요

- Baseline을 새 Discord 메시지보다 무조건 우선하는 절대 진실로 보지 않는다.
- Snapshot에서 충돌/변경 신호가 있으면 필요한 Topic만 과거 Search로 보완한다.
- 충분한 근거가 있을 때만 `superseded / rejected` 후보로 변경한다.
- 새로운 confirmed decision 자동 등록은 하지 않는다.

---

## 4. Team Brief v2.1

사용자가 현재 팀 상태를 요청하면 `get_team_brief_context`를 사용한다.

판정 순서:

```text
Decision Baseline
→ Current Discord Snapshot
→ 충돌/부족한 Topic만 Search
→ Team Brief
```

기본 출력 순서:

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

### Current Decisions

- Baseline confirmed 항목을 현재 기준으로 시작한다.
- 최근 Snapshot에서 다시 언급되지 않았다는 이유로 제거하지 않는다.
- 새로운 변경 Evidence가 있으면 기존 결정과 비교한다.

### 출력 원칙

- 중요하지 않은 빈 섹션은 생략 가능
- 현재 상태와 과거 이력을 분리
- Blocker와 Risk를 구분
- 완료 언급만 있으면 completion candidate
- 실제 결과 Evidence가 있으면 done
- 담당자가 명시되지 않았으면 임의 배정 금지
- 결정 상태는 `confirmed / proposed / superseded / rejected / unclear`

---

## 5. Delta Brief v1.1

Delta Brief는 전체 현황을 다시 쓰지 않는다.

기본 window는 24시간이며 사용자가 기준시각/기간을 지정하면 그것을 사용한다.

Baseline은 **변화 전 reference**로만 사용한다.

```text
Decision Baseline
      vs
Delta Snapshot
```

Baseline의 기존 confirmed 항목 자체를 새 결정으로 반복하지 않는다.

출력 순서:

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

기존 confirmed decision이 변경된 것처럼 보이면 필요한 과거 Evidence를 확인한 후 Changed Decisions로 올린다.

---

## 6. Decision Ledger

Decision 요청은:

```text
get_decision_ledger_context
```

를 우선 사용한다.

반환 구조:

```text
baseline.currentDecisions
baseline.openDecisions
snapshot
contract
```

권장 출력:

```text
Current Decisions
Decision Changes
Open Decisions
Conflicts / Unclear
Evidence / Freshness
```

Decision 상태:

```text
confirmed
proposed
superseded
rejected
unclear
```

`confirmed decision`과 `implementation done`은 별개다.

예:

```text
Jira → Branch → PR → Review → Merge → Done
```

이라는 운영 규칙이 confirmed여도 실제 E2E 검증은 미완료일 수 있다.

---

## 7. Search 보완 조건

Snapshot/Baseline만으로 충분하면 Search하지 않는다.

다음 경우만 보완한다.

- 결정 이유가 필요함
- 변경 이력이 필요함
- Baseline과 최신 메시지가 충돌함
- 기존 결정을 superseded/rejected 할 가능성이 있음
- 완료/담당 Evidence가 부족함
- 사용자가 과거 전체를 요구함

---

## 8. Completeness / Freshness

항상 Snapshot metadata를 해석한다.

### historyComplete = false

```text
최근 조회 범위 기준이며, 과거 전체 기록을 모두 확인한 것은 아닙니다.
```

### historyComplete = true

지정된 `since` 경계까지 각 채널을 충분히 확인했다는 의미다.

단, Discord 외부 시스템(Notion/Jira/GitHub)의 전체 사실까지 확인했다는 의미는 아니다.

---

## 9. Tool 선택 요약

```text
현재 팀 상황
→ get_team_brief_context

현재 결정 / 결정 변경
→ get_decision_ledger_context

어제/회의 이후 변화
→ get_team_delta_context

원본 메시지 묶음
→ get_team_context_snapshot

과거 특정 결정/근거
→ search_discord_messages

특정 채널 최근 내용
→ get_recent_discord_messages

채널 찾기
→ list_discord_channels
```

---

## 10. Write 원칙

이 Skill은 현재 Discord read-only다.

- Discord write/delete 없음
- Jira/Notion/GitHub 변경은 먼저 후보를 제시
- 실제 write는 사용자의 명시적인 실행 요청 후 수행
- delete/bulk destructive 변경은 별도 강한 승인 필요
