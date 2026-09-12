# Changelog

이 문서는 Gyuniverse Discord Bridge의 **공개 가능한 개발 과정**을 요약합니다. 실제 Workspace의 Identity, 내부 검증 데이터, 비공개 팀 의사결정은 의도적으로 제외했습니다.

## 2026-09-03 — Discord Bridge 기반 구현

- Discord text channel 목록 조회 기능 추가
- 채널별 최근 메시지 조회 기능 추가
- Discord history search 기능 추가
- Discord search indexing이 준비되지 않은 경우 recent-message fallback 추가
- Decision, Task, Blocker, Risk, Unresolved Question을 구분하는 Evidence-aware Team Context 규칙 설계

## 2026-09-04 — Multi-client 및 Team Context 확장

- Claude Code Remote MCP 연동 추가
- Hosted MCP client를 위한 OAuth, Dynamic Client Registration(DCR), PKCE 지원
- Hosted client callback 호환성 개선
- 공통 `Team Context Snapshot` 추가
- `Team Brief` / `Delta Brief` context contract 추가
- `Decision Baseline` / `Decision Ledger` context 구조 추가
- Signed `Team State Checkpoint`와 deterministic state diff 추가
- ChatGPT MCP OAuth callback 지원

## 2026-09-13 — Public v1 준비

- 실제 운영 저장소와 공개용 sanitized repository 분리
- 전체 Git history를 재작성하여 실제 팀원 정보, Jira/Discord 식별자, 내부 의사결정 데이터 제거
- 전체 history privacy scan 및 Gitleaks secret scan 수행
- 실제 `.env` 추적 이력 및 credential 노출 여부 검증
- 공개용 Decision Baseline을 fictional/example 데이터로 교체
- Hard-coded Workspace 식별자를 환경변수 또는 example 값으로 변경
- TypeScript 7 / Web Crypto `BufferSource` 타입 호환성 수정
- `pnpm typecheck` 통과 확인
- README와 `docs/`를 한국어 중심 문서로 정리
- `SECURITY.md`와 Public Release 검증 기준 정리
- 라이선스를 **Apache License 2.0**으로 통일
- 공개 저장소의 Git history는 sanitized history만 포함하도록 분리

## Public Distribution 원칙

공개 저장소에는 다음 정보를 포함하지 않습니다.

- 실제 Workspace Identity Map
- 실제 Discord guild/channel ID
- Jira account ID 및 reconciliation report
- 실제 팀 Decision Baseline / Team Brief
- Production Secret / Token
- Private PR diff에 포함된 운영 데이터

공개 저장소는 재사용 가능한 source code, example configuration, architecture/documentation을 제공하고, 실제 운영 데이터와 credential은 별도 Private 환경에서 관리합니다.
