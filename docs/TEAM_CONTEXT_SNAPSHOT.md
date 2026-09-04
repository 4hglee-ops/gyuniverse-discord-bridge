# Team Context Snapshot

기준일: 2026-09-04

## 목적

`Team Context Snapshot`은 Team Brief / Decision Ledger / Delta Brief가 매번 채널별 API를 제각각 호출하지 않고 같은 Discord Evidence Pack을 입력으로 사용하도록 만드는 공통 읽기 계층이다.

```text
Discord channels
      ↓
Team Context Snapshot
      ↓
┌──────────────┬─────────────────┬─────────────┐
│ Team Brief   │ Decision Ledger │ Delta Brief │
└──────────────┴─────────────────┴─────────────┘
```

Snapshot 자체는 팀의 결정, 담당, 완료 상태를 확정하지 않는다.

서버가 제공하는 것은:

- 원본 Discord 메시지
- 작성자
- 채널
- 시각
- 첨부파일
- Snapshot 생성 시각
- 데이터 freshness
- 조회 범위 completeness

판정은 Evidence Model / Decision Ledger / Task Candidate 규칙을 사용하는 AI client에서 수행한다.

## MCP Tool

```text
get_team_context_snapshot
```

입력:

```json
{
  "channelIds": ["optional-channel-id"],
  "since": "2026-09-04T00:00:00+09:00",
  "perChannelLimit": 50
}
```

- `channelIds`: 생략 시 접근 가능한 모든 텍스트 채널
- `since`: 선택. 이 시각 이후 메시지만 반환
- `perChannelLimit`: 채널별 1~100, 기본 50

## GPT Actions

Endpoint:

```text
GET /api/gpt/v1/context-snapshot
```

Operation ID:

```text
getTeamContextSnapshot
```

Query parameters:

```text
channelIds=154...,...
since=2026-09-04T00:00:00+09:00
perChannelLimit=50
```

MCP와 GPT Actions는 `src/context/team-context-snapshot.ts`의 동일한 builder를 사용한다.

## 응답 핵심 구조

```text
snapshotAt
source
server
scope
freshness
completeness
channels[]
authors[]
messageCount
messages[]
```

### freshness

`newestMessageAt`으로 Snapshot에 포함된 최신 Discord Evidence 시각을 확인한다.

### completeness

`historyComplete`는 `since`가 있을 때만 의미가 있다.

각 채널에서:

- `since` 경계까지 실제로 도달했거나
- Discord 최근 메시지를 모두 소진한 경우

그 채널의 `windowComplete=true`로 본다.

반대로 `perChannelLimit`에 걸렸는데 가장 오래된 조회 메시지가 여전히 `since`보다 최신이면 더 많은 메시지가 누락되었을 수 있으므로 incomplete다.

`since` 없이 호출하면 의도적으로 bounded recent snapshot이므로 전체 과거 이력이라고 주장하지 않는다.

## Team Brief 권장 흐름

```text
1. get_team_context_snapshot
2. Snapshot freshness/completeness 확인
3. Current Decisions
4. What Changed
5. In Progress
6. Assigned / Unassigned
7. Blockers / Risks
8. Unresolved Questions
9. Proposals
10. Decisions Needed Next
11. Evidence 표시
```

과거 결정 이력이 필요한 Topic만 `search_discord_messages`를 추가 호출한다.

즉 기존처럼 모든 질문에서 무조건 채널 recent + search를 반복하지 않는다.

## Delta Brief 권장 흐름

예:

```text
since = 이전 Brief 생성 시각
```

Snapshot을 만든 뒤:

```text
New Decisions
New Tasks
Completion Candidates
New Blockers
Resolved Blockers
New Questions
Changed Proposals
```

을 분류한다.

v1은 별도 Snapshot DB를 저장하지 않으므로 사용자가 기준 시각을 주거나 이전 Brief 시각을 client context에서 가져와야 한다.

향후 persistent snapshot/history가 필요하면 별도 저장 계층을 추가한다.

## 현재 제한

- Thread / Reply 관계는 아직 `BridgeMessage`에 포함되지 않는다.
- 최대 최근 100 messages/channel이라는 Discord recent endpoint 한계가 있다.
- Snapshot은 Discord만 포함한다. Jira/Notion/GitHub는 이후 Reconciliation layer에서 합친다.
- Snapshot 자체는 LLM inference를 수행하지 않는다.

## 다음 기능

1. Snapshot live smoke test
2. Team Brief v2가 Snapshot-first로 동작하도록 공통 Skill 정리
3. Delta Brief 구현
4. Evidence deep-link / message URL
5. Thread / Reply metadata
6. 필요 시 Snapshot persistence
