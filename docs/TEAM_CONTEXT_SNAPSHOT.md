# Team Context Snapshot

`Team Context Snapshot`은 Team Brief, Decision Ledger, Delta Workflow가 서로 다른 방식으로 채널을 다시 조회하지 않고 **하나의 공통 Discord Evidence Pack**을 사용하도록 만드는 기능입니다.

```text
Discord Channels
      ↓
Team Context Snapshot
      ↓
Team Brief / Decision Ledger / Delta Brief
```

Snapshot 자체가 무엇이 확정되었는지, 누가 담당자인지, 무엇이 완료되었는지를 판단하는 것은 아닙니다. Snapshot은 **Evidence와 Retrieval Metadata**를 제공합니다.

## MCP Tool

```text
get_team_context_snapshot
```

입력 예시:

```json
{
  "channelIds": ["optional-channel-id"],
  "since": "2026-01-01T00:00:00Z",
  "perChannelLimit": 50
}
```

- `channelIds`: 선택값. 생략하면 접근 가능한 전체 text channel 포함
- `since`: 선택값. 조회할 시간 경계
- `perChannelLimit`: 채널별 1–100, 기본값 50

## GPT Actions

```text
GET /api/gpt/v1/context-snapshot
operationId: getTeamContextSnapshot
```

Query 예시:

```text
channelIds=channel-a,channel-b
since=2026-01-01T00:00:00Z
perChannelLimit=50
```

## Response Shape

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

## Freshness

`newestMessageAt`은 Snapshot에 포함된 Discord Evidence 중 가장 최근 메시지 시각을 나타냅니다.

이를 통해 AI client는 "현재 상태"라고 말하기 전에 데이터가 얼마나 최근 것인지 확인할 수 있습니다.

## Completeness

`historyComplete`는 `since` 경계를 지정했을 때 특히 중요합니다.

다음 조건 중 하나를 만족하면 해당 channel window를 complete로 볼 수 있습니다.

- 요청한 `since` 시점까지 조회가 도달함
- 사용 가능한 최근 history를 모두 소진함

반대로 `perChannelLimit`에 먼저 도달했다면 더 오래된 메시지가 남아 있을 수 있으므로 window는 incomplete입니다.

`since`를 생략하면 Snapshot은 의도적으로 **bounded recent view**가 됩니다. 이 경우 전체 Discord history라고 표현하면 안 됩니다.

## 권장 Team Brief Flow

1. Snapshot 생성
2. Freshness / Completeness 확인
3. Evidence Rule 적용
4. Decision / Work / Blocker / Question / Proposal 구성
5. Snapshot만으로 부족한 경우 특정 History 추가 검색

## 현재 제한사항

- Thread / Reply 관계는 아직 `BridgeMessage`에 표현되지 않음
- Recent Fetch는 채널별 최대 100개 메시지로 제한
- Snapshot은 Discord만 다루며 외부 source reconciliation은 별도 layer의 역할
- Snapshot 자체는 LLM inference를 수행하지 않음

즉 Snapshot은 **판단 결과가 아니라 판단을 위한 근거 묶음**입니다.
