# Claude / Claude Code 연동 가이드

이 문서는 직접 배포한 Gyuniverse Discord Bridge를 Claude 또는 Claude Code에 연결하는 방법을 설명합니다.

예시에서는 다음과 같은 본인 배포 주소를 사용합니다.

```text
https://your-discord-bridge.example.com/mcp
```

## Claude Code — Static Bearer 방식

PowerShell 예시:

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"
claude mcp add --transport http gyuniverse-discord https://your-discord-bridge.example.com/mcp --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

프로젝트 단위 설정이 필요하면 `.mcp.json.example`을 참고하세요. 실제 Secret 값을 파일에 직접 넣지 말고 환경변수 참조만 version control에 남기는 것을 권장합니다.

## OAuth 지원 Hosted Connector

Bridge는 OAuth metadata를 노출하고 DCR + PKCE 기반 연결을 지원합니다.

필수 운영 환경변수:

```text
PUBLIC_BASE_URL
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
```

OAuth scope:

```text
discord:read
```

OAuth 방식에서도 Discord write 권한은 제공하지 않습니다.

## 연결 확인

연결 후 아래와 같은 요청으로 동작 여부를 확인할 수 있습니다.

```text
접근 가능한 Discord 채널을 보여줘.
```

```text
테스트 채널의 최근 메시지를 읽고 요약해줘.
```

```text
특정 키워드를 과거 대화에서 검색하고 근거와 함께 보여줘.
```

## 보안 원칙

- Bearer Secret과 OAuth Secret을 repository에 커밋하지 않습니다.
- Static Bearer, approval code, signing secret은 서로 다른 값을 사용합니다.
- 노출이 의심되면 즉시 credential을 rotate합니다.
- Discord Bot에는 필요한 최소 Read 권한만 부여합니다.
- Bridge는 Discord create/edit/delete 도구를 제공하지 않습니다.
