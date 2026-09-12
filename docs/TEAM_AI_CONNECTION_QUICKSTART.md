# AI Client 연결 Quick Start

이 문서는 직접 배포한 Gyuniverse Discord Bridge를 AI client에 연결하는 가장 빠른 방법을 설명합니다.

예시에서는 다음 origin을 사용합니다.

```text
https://your-discord-bridge.example.com
```

## Remote MCP

Endpoint:

```text
https://your-discord-bridge.example.com/mcp
```

### Static Bearer 방식

PowerShell 예시:

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"
claude mcp add --transport http gyuniverse-discord https://your-discord-bridge.example.com/mcp --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

실제 Secret을 다음 위치에 직접 넣지 마세요.

- `.mcp.json`
- Source Code
- README / Docs
- Screenshot
- Issue / Pull Request

가능하면 환경변수 참조만 version control에 남깁니다.

## OAuth 지원 MCP Client

Bridge는 OAuth Protected Resource / Authorization Server metadata를 제공하고, public DCR + PKCE client 연결을 지원합니다.

운영 환경에서 필요한 값:

```text
PUBLIC_BASE_URL
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
```

OAuth scope는 read-only입니다.

```text
discord:read
```

## GPT Actions

OpenAPI schema:

```text
https://your-discord-bridge.example.com/api/gpt/openapi
```

Authentication:

```text
API Key / Bearer
```

GPT Actions용으로는 `MCP_SHARED_SECRET`과 분리된 `GPT_ACTIONS_API_KEY` 사용을 권장합니다.

## 기본 Smoke Test

연결 후 다음 요청으로 정상 동작 여부를 확인할 수 있습니다.

```text
접근 가능한 Discord text channel을 보여줘.
```

```text
테스트 채널의 최근 메시지를 읽고 요약해줘.
```

```text
특정 키워드를 과거 대화에서 검색하고, 결과가 전체 history인지 recent fallback인지 알려줘.
```

## Security Boundary

이 프로젝트는 Discord **read/search 기능만** 노출합니다.

```text
✅ 채널 조회
✅ 최근 메시지 조회
✅ 과거 대화 검색

❌ 메시지 작성
❌ 메시지 수정
❌ 메시지 삭제
```

AI client가 연결되었다는 이유만으로 Discord Workspace의 쓰기 권한을 가지는 것은 아닙니다.
