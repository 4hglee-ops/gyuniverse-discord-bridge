# Claude Chat / Cowork Live Validation

기준일: 2026-09-04

## Claude Chat OAuth v1 — 실제 연결 성공

Production Remote MCP:

```text
https://gyuniverse-discord-bridge.vercel.app/mcp
```

Claude Custom Connector 설정:

- 인증: 항상 필요
- OAuth client: Client ID 없음 / Dynamic Client Registration
- 추가 request header: 없음
- scope: `discord:read`

## 실제 Production 요청 흐름

Vercel runtime log에서 아래 순서를 확인했다.

```text
POST /mcp                                   401
GET  /.well-known/oauth-protected-resource  200
GET  /.well-known/oauth-authorization-server 200
POST /oauth/register                        201
GET  /oauth/authorize                       200
POST /oauth/authorize                       303
POST /oauth/token                           200
POST /mcp                                   200
POST /mcp                                   200
...
```

판정:

- MCP protected resource discovery: DONE
- Authorization Server discovery: DONE
- Dynamic Client Registration: DONE
- PKCE authorization: DONE
- team-code approval: DONE
- authorization code callback handoff: DONE
- access token exchange: DONE
- OAuth access token으로 MCP 인증: DONE
- Claude Chat Remote MCP 연결: DONE

## 연결 중 확인된 문제와 수정

### 1. Authorization response handoff

초기에는 승인 POST가 302를 반환했지만 Claude callback 이후 `/oauth/token` 호출이 발생하지 않았다.

보완:

- authorization response에 `iss` 포함
- Authorization Server Metadata에 `authorization_response_iss_parameter_supported: true`
- 승인 POST 후 redirect status를 `303`으로 변경

### 2. CSP가 Chrome callback redirect 차단

승인 페이지의 초기 CSP는 다음과 같았다.

```text
form-action 'self'
```

Chrome 계열 브라우저에서 form POST 후 외부 Claude callback으로 이어지는 redirect가 차단되어 브라우저가 `/oauth/authorize`에 머물렀다.

수정:

```text
form-action 'self' https://claude.ai https://claude.com
```

수정 후 실제 `/oauth/token 200`과 `/mcp 200`을 확인했다.

## 현재 권한

OAuth v1은 아래 scope만 제공한다.

```text
discord:read
```

현재 노출 Tool:

- `list_discord_channels`
- `get_recent_discord_messages`
- `search_discord_messages`

Discord write / delete 권한은 없다.

## 다음 검증

Claude Chat 연결은 완료했다.

다음 단계:

1. Claude Chat에서 실제 Discord 채널 조회 / 최근 메시지 / 검색 smoke test
2. Cowork에서 동일 `Gyuniverse Discord` Connector 활성화
3. Cowork에서 3개 Tool discovery 및 Discord smoke test
4. Chat과 Cowork에서 Team Brief 결과 비교
5. 팀 배포 전에 별도 `MCP_OAUTH_TEAM_CODE` / `MCP_OAUTH_SIGNING_SECRET` 사용 여부 검토

## OAuth v1 이후 보안 Backlog

현재는 read-only pilot을 위한 stateless OAuth다.

v2 후보:

- persistent authorization state
- authorization code one-time consumption
- refresh token family / rotation invalidation
- 사용자별 identity
- 사용자별 revoke
- audit log
- read/write scope 분리
