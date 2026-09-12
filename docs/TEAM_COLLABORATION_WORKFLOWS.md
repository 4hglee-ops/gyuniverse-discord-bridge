# Team Collaboration Workflows

이 문서는 Discord를 **Team Context의 Evidence Source**로 사용할 때 적용할 일반적인 해석 규칙을 정의합니다.

## Evidence Model

### Primary Evidence

직접성이 가장 높은 근거입니다.

- 본인이 자신의 진행상황이나 완료 여부를 직접 보고
- 실제 artifact, PR, 문서, screenshot, 결과물을 공유
- 명시적인 팀 합의가 기록됨

### Secondary Evidence

직접 근거를 요약하거나 전달한 자료입니다.

- 회의 요약
- 리드/팀원의 상태 정리
- 다른 사람의 상황을 대신 전달한 메시지

### Inferred Evidence

직접 확인되지 않은 추론입니다.

- 역할상 특정 작업과 관련 있어 보임
- Username이 특정 사람과 연결되는 것으로 보임
- Artifact 링크만 보고 전체 작업이 끝났다고 추정

**Inferred Evidence만으로 Identity, Assignment, Completion, Decision을 확정하지 않습니다.**

## Decision Ledger

상태:

```text
confirmed
proposed
superseded
rejected
unclear
```

규칙:

1. 한 사람의 의견만으로 confirmed decision으로 처리하지 않습니다.
2. 명확한 합의 표현과 반복된 실제 운영 적용은 더 강한 근거입니다.
3. 기존 결정이 변경되면 이전 결정을 삭제하지 않고 `superseded` history로 남깁니다.
4. 더 최근 메시지라도 단순 proposal일 수 있습니다.
5. 결정 이유가 Evidence에 없으면 임의로 만들어내지 않습니다.

## Task Candidate

상태 예시:

```text
candidate
assigned
in_progress
completion_candidate
done
blocked
cancelled
```

해석 예시:

- `해야 한다` → `candidate`
- `내가 하겠다` → `assigned`
- `작업 중이다` → `in_progress`
- `끝났다` → 우선 `completion_candidate`
- 실제 artifact/result까지 충분히 확인됨 → `done`
- 담당자는 추측해서 생성하지 않음

## Blocker / Risk

- **Blocker**: 현재 진행을 실제로 막고 있는 문제
- **Risk**: 일정·품질에 영향을 줄 가능성은 있지만 아직 진행을 막지는 않는 문제

## Unresolved Question

근거가 충분한 경우 질문을 다음과 같이 구분할 수 있습니다.

```text
open
answered
resolved_by_action
stale
```

## Team Brief 권장 구조

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
11. Evidence / Freshness

## External Write Boundary

Discord Bridge 자체는 read-only입니다.

Jira, GitHub, Notion 등 write-capable system과 함께 사용할 경우 외부 쓰기는 반드시 **별도 authorization step**으로 취급하세요. Discord 문맥만으로 담당자를 확정하거나 destructive action을 수행해서는 안 됩니다.
