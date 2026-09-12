# Hosted MCP OAuth 연동

Gyuniverse Discord Bridge는 OAuth로 보호된 Remote MCP 연결을 지원합니다. 이 문서는 OAuth를 지원하는 hosted MCP client가 Bridge에 연결되는 흐름과 운영 시 주의점을 설명합니다.

## 인증 흐름

```text
Hosted MCP client
      |
      | token 없이 요청
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
      +--> /oauth/authorize  (PKCE + approval)
      +--> /oauth/token
      |
      v
Authorization: Bearer <OAuth access token>
      |
      v
/mcp -> Discord read-only tools
```

## Scope

```text
discord:read
```

Bridge는 Discord 메시지 생성·수정·삭제 도구를 제공하지 않습니다. OAuth를 사용하더라도 접근 범위는 Discord read/search 기능으로 제한됩니다.

## 운영 환경 필수 설정

```text
PUBLIC_BASE_URL=https://your-discord-bridge.example.com
MCP_OAUTH_TEAM_CODE=<dedicated approval code>
MCP_OAUTH_SIGNING_SECRET=<dedicated high-entropy signing secret>
```

운영 환경에서는 다음 값을 서로 다른 Secret으로 관리하는 것을 권장합니다.

```text
MCP_SHARED_SECRET
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
```

하나의 값을 여러 인증 용도로 재사용하지 않는 것이 핵심입니다.

## Client Registration

서버는 **Dynamic Client Registration(DCR)** 과 **PKCE S256**을 지원합니다. 허용되는 callback 계열은 `src/oauth/stateless.ts`의 정책을 따르며, 호환 hosted MCP client와 localhost loopback 개발 흐름을 포함합니다.

## Token Lifetime

| 항목 | 기본 수명 |
| --- | ---: |
| Authorization Code | 120초 |
| Access Token | 24시간 |
| Refresh Token | 30일 |

## v1 제한사항

현재 OAuth 구현은 stateless하고 비교적 가볍게 설계되어 있습니다. 다음 기능은 제공하지 않습니다.

- persistent authorization database
- 사용자별 개별 revoke
- refresh-token family invalidation
- durable authorization audit history

따라서 대규모 multi-tenant 서비스로 사용할 경우에는 persistent authorization state, 사용자별 identity, revoke 정책을 추가하는 것이 필요합니다.

## 연결 주소

본인이 배포한 Bridge 주소를 사용합니다.

```text
https://your-discord-bridge.example.com/mcp
```

## 보안 주의사항

실제 approval code, signing secret, bearer secret, access token, refresh token은 다음 위치에 남기지 마세요.

- Git repository
- README / docs
- Issue / Pull Request
- Screenshot
- 채팅에 공유되는 공개 예시

공개 문서에는 항상 placeholder만 사용합니다.
