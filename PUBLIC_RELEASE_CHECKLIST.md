# Public Release 검증 기록

이 문서는 `gyuniverse-discord-bridge`를 Public으로 전환하기 전에 수행한 검증 항목과 현재 상태를 기록합니다.

## 완료된 검증

- [x] 전체 Git history secret scan 수행 (`Gitleaks 8.30.0`)
- [x] Secret scan 결과 0건 확인
- [x] 실제 Discord guild/channel numeric ID가 source/docs/history에 남아 있지 않은지 확인
- [x] 실제 팀원 이름, Workspace 식별자, Jira account ID, 내부 Decision/Brief 데이터가 history에 남아 있지 않은지 확인
- [x] 실제 `.env` 파일 추적 이력이 없는지 확인
- [x] `.env.example`의 credential 값이 placeholder/빈 값인지 확인
- [x] 공개 문서에서 실제 Production endpoint 대신 self-hosted example URL 사용
- [x] `MCP_SHARED_SECRET`, `MCP_OAUTH_TEAM_CODE`, `MCP_OAUTH_SIGNING_SECRET` 역할 분리
- [x] 공개용 Decision Baseline을 fictional/example 데이터로 교체
- [x] `pnpm install` 수행
- [x] `pnpm typecheck` 성공 (`tsc --noEmit`, TypeScript 7.0.2)
- [x] TypeScript 7 / Web Crypto `BufferSource` 호환성 수정
- [x] Sanitized Git history를 별도 Public repository에 배포
- [x] Original internal repository / Private PR history와 Public repository 분리
- [x] Push 후 fresh clone에서 privacy / Gitleaks 재검증
- [x] README, LICENSE, SECURITY.md, CHANGELOG 존재 확인
- [x] Banner / Logo asset 존재 확인
- [x] Apache License 2.0 적용 확인
- [x] Public visibility 전환 완료

## 선택적 / 환경 의존 검증

- [ ] 실제 Discord credential을 사용하는 live smoke test
  - 공개 준비 과정에서는 실제 운영 Secret을 사용하지 않기 위해 실행하지 않음
  - 필요 시 본인이 관리하는 테스트 Discord server와 별도 credential로 Read-only 테스트 수행

- [ ] 배포 환경의 실제 OpenAPI endpoint 최종 smoke test
  - Self-hosted 배포 환경마다 URL과 credential이 다르므로 사용자 환경에서 별도 확인

## Public Repository Boundary

Public repository에는 재사용 가능한 코드와 공개 가능한 문서만 포함합니다.

```text
Public repository
├─ Source code
├─ Example configuration
├─ Architecture / Usage docs
├─ Fictional Decision Baseline
└─ Sanitized Git history

Private environment
├─ Real Discord identity / channel data
├─ Workspace-specific decisions
├─ Jira reconciliation data
├─ Production secrets
└─ Internal validation history
```

## Release 판단

현재 공개 저장소는 privacy / secret / typecheck 기준을 충족했으며 첫 공개 버전 기준으로 **READY** 상태입니다.

새 기능을 추가할 때도 다음 원칙을 유지하세요.

1. 실제 Workspace data를 source에 hard-code하지 않기
2. Secret은 환경변수/Secret Store로 관리하기
3. Write capability는 Read layer와 별도 권한으로 설계하기
4. Release 전 `pnpm typecheck`와 secret scan을 다시 수행하기
