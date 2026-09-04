# Claude Chat / Cowork OAuth v1

기준일: 2026-09-04

목표는 현재 `gyuniverse-discord-bridge`를 Claude Chat / Cowork의 Remote MCP Custom Connector에서 안전하게 사용할 수 있도록 OAuth 기반 인증을 추가하는 것이다.

## 현재 상태

Claude Code는 static Bearer `MCP_SHARED_SECRET` 방식으로 연결 및 Tool discovery까지 검증 완료했다.

Claude Chat / Cowork는 Remote MCP Custom Connector를 지원하며 Anthropic cloud에서 공개 MCP endpoint로 연결한다. OAuth 보호 MCP 서버는 MCP authorization discovery를 제공해야 한다.

현재 OAuth v1 코드의 Vercel Preview build는 `READY`까지 확인했다. 기존 M03의 `TS2688: Cannot find type definition file for 'node'` 경고는 여전히 반복되지만 이번 OAuth 변경에서 새로 발생한 build failure는 확인되지 않았고 Vercel output 생성은 완료된다.

## v1 인증 구조

```text
Claude Chat / Cowork
        |
        | 1. MCP request without token
        v
/mcp -> 401 + resource_metadata
        |
        v
/.well-known/oauth-protected-resource
        |
        v
/.well-known/oauth-authorization-server
        |
        +--> /oauth/register   (DCR)
        +--> /oauth/authorize  (PKCE + team approval)
        +--> /oauth/token
        |
        v
Authorization: Bearer <OAuth access token>
        |
        v
/mcp -> Discord read-only tools
```

## 지원 scope

v1은 최소 권한 원칙으로 아래 하나만 지원한다.

```text
discord:read
```

포함 기능:

- Discord 채널 목록 조회
- 최근 메시지 조회
- 과거 메시지 검색

Discord write / delete 기능은 포함하지 않는다.

## 기존 Claude Code 호환

`/mcp`는 두 인증 경로를 동시에 허용한다.

1. 기존 `Authorization: Bearer MCP_SHARED_SECRET`
2. OAuth에서 발급한 `Authorization: Bearer gya...`

따라서 OAuth 배포 후에도 기존 Claude Code 설정은 그대로 유지된다.

## OAuth endpoints

- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server`
- `/oauth/register`
- `/oauth/authorize`
- `/oauth/token`
- `/mcp`

## Client registration

v1은 Dynamic Client Registration을 지원한다.

허용 redirect URI:

- `https://claude.ai/api/mcp/auth_callback`
- `https://claude.com/api/mcp/auth_callback`
- localhost / 127.0.0.1 HTTP loopback (향후 Desktop/Code OAuth 호환)

등록된 client 정보는 서버 DB 대신 HMAC 서명된 opaque `client_id`에 담는다.

지원 grant:

- `authorization_code`
- `refresh_token`

OAuth Client Secret이 없는 public PKCE client를 기준으로 한다.

## Authorization

`/oauth/authorize`는 PKCE S256을 필수로 요구한다.

사용자는 브라우저 승인 화면에서 팀 접근 코드를 입력한다.

환경변수 우선순위:

```text
MCP_OAUTH_TEAM_CODE
fallback -> MCP_SHARED_SECRET
```

권장 운영은 `MCP_OAUTH_TEAM_CODE`를 별도로 설정하는 것이다.

## Token signing / lifetime

Authorization code, access token, refresh token은 HMAC으로 서명한 opaque token으로 발급한다.

서명 키 우선순위:

```text
MCP_OAUTH_SIGNING_SECRET
fallback -> MCP_SHARED_SECRET
```

현재 v1 TTL:

- authorization code: 120초
- access token: 24시간
- refresh token: 30일

Refresh grant를 사용하면 새 access token과 새 refresh token을 함께 발급한다.

## 보안 제한 / 다음 개선

v1은 별도 DB 없이 동작하는 pilot용 stateless OAuth다.

따라서 다음 한계가 있다.

- authorization code를 서버 저장소에서 one-time consumed 상태로 기록하지 않음
- refresh 시 새 refresh token을 발급하지만 이전 refresh token을 서버에서 즉시 revoke할 수 없음
- 팀 접근 코드는 사용자 identity가 아니라 팀 단위 shared approval 수단임
- 사용자별 session / revoke / audit trail 없음

v2 개선 대상:

- persistent authorization state
- authorization code one-time consumption
- refresh token family / rotation invalidation
- 사용자별 identity
- 사용자별 revoke
- read/write scope 분리
- audit log

현재 프로젝트는 Discord read-only pilot이므로 우선 Claude Chat/Cowork 실제 연결을 검증한 뒤 persistent auth storage 도입 여부를 결정한다.

## 검증 순서

1. Preview build READY — DONE
2. OAuth protected resource metadata 응답 확인 — Preview Deployment Protection 때문에 public smoke test는 Production 반영 후 수행
3. authorization server metadata 응답 확인
4. DCR 등록 확인
5. PKCE authorize page 확인
6. authorization_code → access/refresh token exchange 확인
7. refresh_token grant 확인
8. OAuth access token으로 `/mcp` 접근 확인
9. Claude Chat에서 Custom Connector 등록
10. Claude Chat에서 3개 Tool discovery
11. Cowork에서 동일 Connector 활성화
12. Discord 채널/최근 메시지/검색 smoke test

## Claude UI 등록

OAuth 서버가 Production에 배포된 후 Claude에서:

```text
Customize
-> Connectors
-> +
-> Add custom connector
```

Remote MCP URL:

```text
https://gyuniverse-discord-bridge.vercel.app/mcp
```

v1은 DCR을 지원하므로 우선 Advanced OAuth Client ID / Secret을 입력하지 않고 자동 discovery/registration 경로를 검증한다.

실제 연결 과정에서 `Gyuniverse Discord 연결 승인` 화면이 열리면 팀 접근 코드를 입력한다. 이 값은 저장소나 공개 문서에 기록하지 않는다.
