# Gyuniverse Team Context Skill

이 문서는 Discord Evidence를 보수적이고 추적 가능한 Team Context로 변환하기 위한 **client-agnostic workflow**를 정의합니다.

## Tool Priority

```text
현재 팀 상태
→ get_team_brief_context

현재 결정 / 결정 변경
→ get_decision_ledger_context

이전 시점 이후 변화
→ get_team_delta_context

첫 상태 기준선 생성
→ create_team_state_checkpoint

이전 상태와 비교
→ compare_team_state_checkpoint

Raw Evidence Pack
→ get_team_context_snapshot

특정 과거 근거 검색
→ search_discord_messages
```

## Evidence Rules

다음 항목을 서로 다른 상태로 취급합니다.

- mentioned ≠ decided
- should do ≠ assigned
- intends to do ≠ completed
- artifact shared ≠ whole task complete
- role relevance ≠ actual assignee
- newer message ≠ automatic confirmed decision
- Discord username ≠ verified real-world identity
- recent silence ≠ cancellation of an existing confirmed decision

Inferred Evidence만으로 Identity, Ownership, Completion, Decision을 확정하지 않습니다.

## Decision Baseline

확정된 결정은 명시적인 근거로 superseded 또는 rejected 되기 전까지 유지합니다.

공개 예시 source:

```text
src/context/decision-baseline.ts
docs/DECISION_BASELINE.example.md
```

공개 배포판에는 fictional baseline data만 포함되어 있습니다. 실제 Workspace에서 사용할 경우 본인의 private configuration 또는 검증된 데이터로 교체하세요.

## Team Brief

권장 구조:

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

## Delta Brief

이전 Checkpoint가 존재한다면 최근 메시지 구간만 다시 해석하는 것보다 **deterministic state diff**를 우선합니다.

```text
Previous Checkpoint
      +
Current Normalized State
      ↓
compare_team_state_checkpoint
      ↓
added / removed / status_changed / content_changed
```

이전 Checkpoint가 없다면 bounded Discord time window를 보수적으로 사용하고, 조회 범위의 completeness 제한을 반드시 표시합니다.

## Team State Checkpoint

역할은 다음과 같이 나눕니다.

### AI Client

Discord Evidence를 해석하여 normalized team state를 구성합니다.

### Bridge

- normalized state 검증
- checkpoint token 서명
- 이전 checkpoint 검증
- stable ID 기반 deterministic diff 계산

Checkpoint token은 **signed** 상태이지 **encrypted** 상태가 아닙니다.

따라서 다음 값을 checkpoint state에 넣지 마세요.

```text
Password
API Key
Bearer Token
OAuth Token
기타 Secret
```

Signing에는 전용 Secret을 사용합니다.

```text
MCP_OAUTH_SIGNING_SECRET
```

## Completeness / Freshness

`historyComplete=false`라면 조회된 Discord Evidence가 제한된 범위라는 의미입니다. 전체 history를 확인한 것처럼 표현하지 않습니다.

`historyComplete=true` 역시 **요청한 Discord window**가 완전하다는 뜻입니다. Jira, GitHub, Notion 등 외부 시스템의 상태까지 모두 reconciliation되었다는 의미는 아닙니다.

## Write Boundary

Discord Bridge는 Discord에 대해 read-only입니다.

외부 write-capable system과 함께 사용하는 경우 다음을 분리합니다.

```text
Evidence Interpretation
        ↓
Write Proposal
        ↓
Authorization / Verification
        ↓
External Mutation
```

Discord 문맥만으로 destructive write를 자동 승인하지 않습니다.
