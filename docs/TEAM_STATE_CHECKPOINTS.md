# Team State Checkpoints

Team State Checkpoint는 매번 최근 Discord 메시지를 다시 읽고 "무엇이 바뀌었는지" 추론하는 대신, **정규화된 이전 팀 상태와 현재 팀 상태를 비교**할 수 있게 해줍니다.

```text
Checkpoint A
   ↓
Current Normalized State
   ↓
Deterministic Diff
   ↓
Checkpoint B
```

## 역할 분리

### AI Client

Discord Evidence를 다음과 같은 normalized category로 해석합니다.

```text
decisions
work
blockers
questions
proposals
```

각 항목에는 가능하면 다음 정보가 포함되어야 합니다.

- stable ID
- status
- summary
- evidence reference

### Bridge

Bridge는 해석 자체보다 **검증·서명·비교**를 담당합니다.

- normalized state 검증
- signed checkpoint token 생성
- 이전 checkpoint 검증
- stable ID 기반 diff 계산
- 다음 checkpoint token 반환

Diff 종류:

```text
added
removed
status_changed
content_changed
```

## Tools

MCP:

```text
create_team_state_checkpoint
compare_team_state_checkpoint
```

GPT Actions:

```text
createTeamStateCheckpoint
compareTeamStateCheckpoint
```

## Signing

Checkpoint token은 HMAC SHA-256을 사용합니다.

```text
MCP_OAUTH_SIGNING_SECRET
```

운영 환경에서는 별도의 high-entropy signing secret을 사용하세요.

## Signed ≠ Encrypted

Checkpoint token은 위변조 여부를 검증할 수 있도록 **서명**되어 있지만, 암호화된 비밀 저장소는 아닙니다.

따라서 normalized checkpoint state에 다음 데이터를 넣지 마세요.

```text
Password
API Key
Bearer Credential
OAuth Token
민감한 Raw Message Content
```

Token payload가 읽힐 수 있다는 전제로 저장할 데이터를 결정해야 합니다.

## 상태 변경 예시

```text
work:api-integration
in_progress -> completion_candidate
```

```text
blocker:test-environment
open -> resolved
```

```text
decision:deployment-platform
proposed -> confirmed
```

이처럼 stable ID를 유지하면, 메시지 표현이 달라져도 상태 단위의 변화만 비교할 수 있습니다.

## 왜 필요한가

최근 1시간 또는 하루의 Discord 메시지만 보고 변화를 추론하면 다음 문제가 생길 수 있습니다.

- 이전에 확정된 결정이 최근 대화에 없어서 누락됨
- 같은 작업을 다른 표현으로 말해 새 작업으로 오인
- 단순 언급을 상태 변경으로 잘못 해석

Checkpoint는 이전 normalized state를 명시적인 기준점으로 보존하여 이런 문제를 줄이는 역할을 합니다.

## v1 제한사항

- Checkpoint token을 서버가 영구 저장하지 않음
- 이전 token은 client 또는 conversation이 보관해야 함
- Stable ID 품질은 normalization layer에 의존
- Persistent history와 revoke 기능은 향후 확장 영역

즉 v1의 Checkpoint는 **가볍고 stateless한 상태 비교 도구**이며, 장기 저장소 자체를 대체하지는 않습니다.
