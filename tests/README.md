# v1.0.0 회귀 테스트 기준선

v2 개발에 앞서 기존 v1.0.0 동작을 고정하는 오프라인 회귀 테스트입니다. 운영 구현과 API 응답 구조를 변경하지 않습니다.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

Discord Bot token, 운영 OAuth Secret, GPT Actions API Key 없이 실행됩니다.
테스트에서는 `tests/fixtures.ts`의 가짜 Discord REST 응답만 사용합니다.

| 파일 | 검증 범위 |
| --- | --- |
| `discord-context.test.ts` | 채널, 메시지, 검색, fallback, Snapshot, Team Context |
| `mcp-contract.test.ts` | 기존 MCP Tool 9개 등록 및 핵심 handler 계약 |
| `oauth.test.ts` | Discovery, DCR, 승인, PKCE, refresh, MCP 인증 challenge |
| `gpt-actions.test.ts` | GPT Actions 인증, 채널·메시지·검색·Context·Checkpoint·Diff |
| `checkpoint.test.ts` | gycp1 서명, 위변조, 상태 변화 분류 |

## 범위 외

- MCP handler 수준의 계약 테스트이며, 실제 MCP wire protocol/ChatGPT/Claude 연결까지 검증하지 않습니다.
- Discord Bot의 실제 VIEW_CHANNEL, READ_MESSAGE_HISTORY, 메시지 콘텐츠 접근은 별도 통합 smoke 테스트가 필요합니다.
- 실제 Vercel 배포·OAuth callback 연동·Discord 검색 인덱스 상태는 이 오프라인 테스트로 보장하지 않습니다.
- v1의 개인 사용자 미식별/채널 ACL 부재를 허용하는 것이 아니라, v2에서 수정할 기존 동작으로 기록합니다.

## v2 추가 예정

- 개인별 인증, Guild/Channel ACL 및 직접 채널 ID 공격 차단
- 검색·Snapshot·Decision Context의 서버 간 데이터 격리
- 신규 채널 기본 차단과 변경 즉시 token 접근 차단
- guild-scoped Decision Baseline 및 Checkpoint 호환성

## v2 Admin API (개발 중)

관리 작업은 `POST /api/admin/v1/actions`와 전용 `BRIDGE_ADMIN_API_KEY`로만 수행합니다.
기존 `MCP_SHARED_SECRET` 또는 `GPT_ACTIONS_API_KEY`는 관리자 API에 사용할 수 없습니다.
관리 API에는 서버 측 `BRIDGE_SUPABASE_SERVICE_ROLE_KEY`가 필요합니다.

지원 작업: `registerGuild`, `syncGuild`, `createUser`, `setAccess`, `issueCredential`, `revokeCredential`.
개인 키는 생성 시 한 번만 반환되고 DB에는 SHA-256 해시만 저장됩니다.

DB 마이그레이션은 반드시 `001_bridge_acl.sql` 다음에 `002_bridge_admin.sql`을 적용해야 합니다.
현재 실제 운영 DB에는 적용하지 않았습니다. 관리자 UI는 별도 작업입니다.

## v2 관리 콘솔

관리 콘솔: `/api/admin/v1/ui` (개발 브랜치 전용, Production 미배포)

추가 환경변수:
- `BRIDGE_ADMIN_UI_PASSWORD`: 로그인 전용 비밀번호, 32자 이상
- `BRIDGE_ADMIN_SESSION_SECRET`: HttpOnly 세션 HMAC 서명 전용, 32자 이상
- `BRIDGE_ADMIN_API_KEY`: 프로그램 간 관리자 API 전용, 32자 이상
- `BRIDGE_SUPABASE_URL` / `BRIDGE_SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 DB 자격증명

UI와 관리자 API는 서로 다른 자격증명을 사용합니다.
브라우저 관리 세션은 2시간 유효하며, HttpOnly / SameSite=Strict / HTTPS Secure 쿠키,
동일 출처(Origin) 검사 및 CSRF 헤더를 사용합니다.
로그아웃은 브라우저 쿠키를 삭제하지만 이미 발급된 서명 세션을 서버에서 개별 폐기하지는 않습니다.
관리 UI 비밀번호와 HMAC 서명키는 반드시 다른 값으로 설정합니다.

관리 콘솔에는 서버 등록·채널 동기화, 사용자 생성, 권한 모드/채널 체크박스,
개인 키 발급·폐기, 최근 감사 로그가 포함됩니다.
개인 키는 한 번 표시되며 기존 팀 공용 토큰을 화면에서 취급하지 않습니다.

마이그레이션 `001_bridge_acl.sql` 및 `002_bridge_admin.sql`은
아직 실제 Bridge 데이터베이스에서 실행 검증하지 않았습니다.
관리 콘솔을 Production에 배포하기 전 테스트 DB에 마이그레이션을 적용하고,
관리 RPC의 원자성·권한 회수·신규 채널 기본 차단을 검증해야 합니다.
