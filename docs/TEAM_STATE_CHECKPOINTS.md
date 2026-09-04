# Team State Checkpoints / Delta Brief v2

기준일: 2026-09-04

## 목적

기존 Delta Brief v1은 `지난 N시간 메시지`를 보고 무엇이 바뀌었는지 추론했다.

Delta Brief v2는 가능하면 아래처럼 실제 상태를 비교한다.

```text
Checkpoint A
  -> Current normalized state
  -> deterministic diff
  -> Checkpoint B
```

## 책임 분리

### AI가 하는 일

Discord Snapshot + Decision Baseline + Evidence 규칙을 사용해 현재 팀 상태를 정규화한다.

정규화 범위:

```text
decisions
work
blockers
questions
proposals
```

각 항목:

```json
{
  "id": "stable-id",
  "status": "confirmed | proposed | in_progress | resolved | ...",
  "summary": "현재 상태 요약",
  "evidenceIds": ["discord-message-id-or-baseline-id"]
}
```

### Bridge가 하는 일

Bridge는 의미를 추론하지 않는다.

- 정규화 상태 검증
- 서명된 checkpoint token 생성
- 이전 checkpoint 서명 검증
- stable id 기반 deterministic diff
- 다음 checkpoint token 발급

Diff 종류:

```text
added
removed
status_changed
content_changed
```

## MCP 도구

```text
create_team_state_checkpoint
compare_team_state_checkpoint
```

## GPT Actions

```text
createTeamStateCheckpoint
compareTeamStateCheckpoint
```

## Checkpoint metadata

```json
{
  "snapshotAt": "2026-09-04T15:00:00+09:00",
  "baselineVersion": "1.0",
  "historyComplete": false,
  "newestMessageAt": "2026-09-04T14:58:00+09:00"
}
```

Checkpoint에는 상태와 metadata가 포함된다.

## 서명

v1 checkpoint token은 HMAC SHA-256 서명 토큰이다.

서명 secret 우선순위:

```text
MCP_OAUTH_SIGNING_SECRET
fallback -> MCP_SHARED_SECRET
```

토큰은 변조 탐지용이며 **암호화된 비밀 저장소가 아니다**.

따라서 checkpoint state에 password, API key, OAuth token 등 secret을 넣지 않는다.

## Delta Brief v2 실행 흐름

### 첫 실행

1. `get_team_brief_context` 또는 `get_team_delta_context`
2. Evidence 규칙으로 상태 정규화
3. `create_team_state_checkpoint`
4. 반환된 token 보존

### 다음 실행

1. 최신 `get_team_delta_context`
2. 현재 상태를 같은 stable id 규칙으로 정규화
3. `compare_team_state_checkpoint`
4. deterministic diff를 사람이 읽는 Delta Brief로 변환
5. 반환된 `currentCheckpointToken`을 다음 비교에 사용

## 예시 전이

```text
work:rag-eval
in_progress -> completion_candidate
```

```text
blocker:figma-access
open -> resolved
```

```text
decision:primary-db
proposed -> confirmed
```

## v1 한계

- checkpoint token 자체를 서버 DB에 저장하지 않음
- 대화/클라이언트가 token을 보존해야 다음 비교 가능
- token은 서명되어 있으나 암호화되지 않음
- stable id 품질은 상태를 정규화하는 AI 규칙에 의존

## 다음 확장

Daily / Meeting Brief 자동화 단계에서 persistent checkpoint store를 붙이면 다음이 가능하다.

- `lastBriefAt` 자동 조회
- 사용자에게 token을 노출하지 않는 자동 diff
- checkpoint history
- state timeline
- Decision / Task / Blocker 장기 추적
