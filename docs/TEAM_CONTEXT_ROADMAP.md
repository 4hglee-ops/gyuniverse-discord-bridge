# Team Context Roadmap

이 문서는 실제 비공개 팀의 현재 작업상태가 아니라, **Gyuniverse Discord Bridge 제품 기능의 공개 Roadmap**을 설명합니다.

## 완료된 기반 기능

- Discord channel listing
- Recent message read
- History search + recent-message fallback
- Remote MCP
- GPT Actions / OpenAPI adapter
- OAuth DCR + PKCE
- Team Context Snapshot
- Team Brief / Decision / Delta workflow contract
- Signed Team State Checkpoint
- Deterministic state diff

현재 단계의 핵심은 단순히 Discord 메시지를 읽는 수준을 넘어, AI가 동일한 근거를 기준으로 팀 상태를 해석할 수 있는 **공통 Context Layer**를 만드는 것입니다.

## 다음 단계

- Thread / Reply 관계 metadata 지원
- Evidence permalink
- Persistent checkpoint storage
- 사용자별 Identity / Revocation 강화
- Private Decision Baseline source 구성 가능화
- 더 다양한 협업도구와의 reconciliation adapter

## 장기 방향

```text
Discord Evidence
      +
Other Collaboration Sources
      ↓
Normalized Team State
      ↓
Traceable AI Assistance
```

Discord는 최종 목적지가 아니라 여러 협업도구 중 하나의 Evidence Source로 봅니다.

장기적으로는 다음과 같은 흐름을 목표로 합니다.

```text
Discord / GitHub / Jira / Notion ...
              ↓
       Evidence Collection
              ↓
      Normalized Team State
              ↓
      AI-assisted Context
```

## Read / Write 분리 원칙

현재 Bridge는 Discord read-only입니다.

향후 외부 시스템에 write 기능을 추가하더라도 다음 원칙을 유지하는 것을 목표로 합니다.

```text
Read Context
   ≠
Write Authorization
```

즉, AI가 팀 상황을 이해할 수 있다는 것과 실제 Workspace를 변경할 수 있다는 것은 별도의 권한과 검증 문제로 취급합니다.
