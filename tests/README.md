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
