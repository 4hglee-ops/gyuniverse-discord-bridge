# Gyuniverse AI 연결 Quick Start

기준일: 2026-09-04

이 문서는 팀원이 `gyuniverse-discord-bridge`를 ChatGPT GPTs, Claude Code, Claude Chat / Cowork에서 빠르게 연결하기 위한 최소 설정만 정리한다.

## 공통

팀 Discord 데이터는 아래 Bridge를 통해 읽는다.

```text
Discord
  -> Gyuniverse Discord Bridge
  -> ChatGPT / Claude
```

Production Remote MCP:

```text
https://gyuniverse-discord-bridge.vercel.app/mcp
```

현재 Discord 기능은 read-only다.

- 채널 목록 조회
- 최근 메시지 조회
- 과거 메시지 검색

쓰기 / 수정 / 삭제는 제공하지 않는다.

---

# 1. ChatGPT GPTs 연결

ChatGPT의 Custom GPT에서는 `Actions` 방식으로 연결한다.

## 입력값

OpenAPI Schema URL:

```text
https://gyuniverse-discord-bridge.vercel.app/api/gpt/openapi
```

Authentication:

```text
API Key
Auth Type: Bearer
```

API Key 값은 팀에서 전달받은 GPT Actions용 key를 사용한다.

Secret 값은 문서 / Git / Discord 공개 채널에 기록하지 않는다.

## GPT 설정 순서

```text
GPT 편집
-> Configure
-> Actions
-> Create new action
-> Import from URL
```

Schema URL:

```text
https://gyuniverse-discord-bridge.vercel.app/api/gpt/openapi
```

Authentication에서:

```text
API Key
Bearer
```

를 선택하고 팀에서 받은 GPT Actions용 key를 입력한다.

Instructions에는 저장소의 아래 문서를 기준으로 사용한다.

```text
docs/GPT_INSTRUCTIONS.md
```

## 정상 연결 시 기대 Action

```text
listDiscordChannels
getRecentDiscordMessages
searchDiscordMessages
```

## 테스트

```text
Discord에서 접근 가능한 채널 목록 보여줘.
```

```text
노트-자원 채널 최근 메시지 10개 읽어서 요약해줘.
```

```text
노트-자원에서 Jira가 언급된 과거 메시지를 검색해줘.
```

---

# 2. Claude Code 연결

Claude Code는 Remote HTTP MCP + Bearer header 방식으로 연결한다.

## Windows PowerShell

먼저 팀에서 전달받은 MCP shared secret을 현재 PowerShell 환경변수에 넣는다.

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"
```

실제 값은 채팅 / Git에 기록하지 않는다.

프로젝트 폴더에서 MCP 등록:

```powershell
claude mcp add --transport http gyuniverse-discord https://gyuniverse-discord-bridge.vercel.app/mcp --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

연결 확인:

```powershell
claude mcp list
```

정상 예시:

```text
gyuniverse-discord: https://gyuniverse-discord-bridge.vercel.app/mcp (HTTP) - √Connected
```

Claude Code 실행:

```powershell
claude
```

Claude Code 내부:

```text
/mcp
```

## 정상 연결 시 기대 Tool

```text
list_discord_channels
get_recent_discord_messages
search_discord_messages
```

## 테스트

```text
Discord에서 접근 가능한 채널 목록 보여줘.
```

---

# 3. Claude Chat / Cowork 연결

Claude Chat과 Cowork는 같은 `Gyuniverse Discord` Remote MCP Connector를 사용한다.

OAuth v1 연결은 실제 Claude Chat에서 검증 완료했다.

## Claude Connector 설정

Claude에서:

```text
Customize
-> Connectors
-> Add custom connector
```

입력값:

```text
Name
Gyuniverse Discord

MCP Server URL
https://gyuniverse-discord-bridge.vercel.app/mcp

Authentication
항상 필요

OAuth Client
클라이언트 ID 없음 — 자동으로 등록

Additional request headers
없음
```

OAuth Client ID / Secret을 직접 입력하지 않는다.

Bridge가 Dynamic Client Registration(DCR)을 지원한다.

## 승인 화면

연결 과정에서 아래 화면이 열린다.

```text
Gyuniverse Discord 연결 승인
```

팀 접근 코드는 팀에서 전달받은 값을 입력한다.

현재 서버의 우선순위:

```text
MCP_OAUTH_TEAM_CODE
fallback -> MCP_SHARED_SECRET
```

팀 배포 시에는 `MCP_OAUTH_TEAM_CODE`를 별도 값으로 운영하는 것을 권장한다.

## 현재 OAuth 권한

```text
discord:read
```

Discord write / delete 권한은 없다.

## 테스트

Claude Chat 또는 Cowork에서:

```text
Discord에서 접근 가능한 채널 목록 보여줘.
```

```text
노트-자원 채널 최근 메시지 10개 읽어서 요약해줘.
```

```text
노트-자원에서 Jira 관련 과거 메시지를 검색해서
확정된 운영 규칙 / 해야 할 일 / 미확정 제안으로 나눠줘.
```

---

# 4. 어떤 연결을 쓰면 되나

| Client | 연결 방식 | 인증 | 현재 상태 |
| --- | --- | --- | --- |
| ChatGPT GPTs | GPT Actions / OpenAPI | Bearer API Key | 검증 완료 |
| Claude Code | Remote HTTP MCP | `MCP_SHARED_SECRET` Bearer | 연결 / Tool discovery 검증 완료 |
| Claude Chat | Remote MCP Custom Connector | OAuth + DCR + PKCE | 실제 Discord read 검증 완료 |
| Claude Cowork | Claude Connector | Claude Chat과 동일 OAuth Connector | 동일 Connector 사용 가능 / smoke test 대상 |

## 팀원에게 전달할 것

ChatGPT GPTs 사용자:

```text
1. OpenAPI URL
2. GPT Actions용 API Key
3. docs/GPT_INSTRUCTIONS.md
```

Claude Code 사용자:

```text
1. MCP URL
2. MCP_SHARED_SECRET
3. claude mcp add 명령
```

Claude Chat / Cowork 사용자:

```text
1. MCP URL
2. Connector 설정값
3. 팀 접근 코드
```

Secret은 공개 문서에 붙이지 않고 개인 DM 또는 별도 안전한 경로로 전달한다.

---

# 5. 공통 smoke test

어떤 AI client든 아래 3개가 되면 기본 연결은 성공으로 본다.

```text
1. 채널 목록 조회
2. 최근 메시지 조회
3. 과거 키워드 검색
```

권장 최종 테스트:

```text
노트-자원, 일반, 세션-계획 채널을 확인해서
현재 팀 상태를
결정됨 / 진행 중 / 담당 작업 / Blocker / 미응답 질문 / 미확정 제안
으로 나눠서 정리해줘.

완료 여부나 담당자는 Discord 근거가 명확한 경우만 확정하고,
추론이면 추론이라고 표시해줘.
```

---

# 6. 상세 문서

Quick Start보다 자세한 내용이 필요할 때만 아래를 본다.

```text
docs/GPT_INSTRUCTIONS.md
docs/CLAUDE_INTEGRATION.md
docs/CLAUDE_CHAT_COWORK_OAUTH.md
docs/CLAUDE_CHAT_COWORK_LIVE_VALIDATION.md
docs/TEAM_CONTEXT_ROADMAP.md
```
