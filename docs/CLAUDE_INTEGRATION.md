# Claude / Claude Code Integration

기준일: 2026-09-04

이 문서는 `gyuniverse-discord-bridge`를 Claude 계열 클라이언트에서 팀 협업 Context Source로 사용하는 방법과 현재 인증 호환성을 정리한다.

## 1. 현재 Remote MCP Endpoint

Production MCP URL:

```text
https://gyuniverse-discord-bridge.vercel.app/mcp
```

서버는 Streamable HTTP 기반 Remote MCP로 동작한다.

현재 인증 방식:

```http
Authorization: Bearer <MCP_SHARED_SECRET>
```

`MCP_SHARED_SECRET` 값 자체는 저장소나 문서에 기록하지 않는다.

## 2. Claude Code — 현재 바로 사용 가능

Claude Code는 원격 HTTP MCP 서버와 정적 Authorization header를 지원하므로 현재 Bridge 구조 그대로 연결 가능하다.

### 개인 / 로컬 범위 연결

PowerShell 예시:

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<팀에서 전달받은 MCP shared secret>"

claude mcp add --transport http `
  --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN" `
  gyuniverse-discord `
  https://gyuniverse-discord-bridge.vercel.app/mcp
```

Bash 예시:

```bash
export GYUNIVERSE_MCP_TOKEN="<team shared secret>"

claude mcp add --transport http \
  --header "Authorization: Bearer $GYUNIVERSE_MCP_TOKEN" \
  gyuniverse-discord \
  https://gyuniverse-discord-bridge.vercel.app/mcp
```

확인:

```text
claude mcp list
claude mcp get gyuniverse-discord
```

Claude Code 세션 내부에서는:

```text
/mcp
```

으로 연결 상태와 노출 Tool을 확인한다.

현재 기대 Tool:

- `list_discord_channels`
- `get_recent_discord_messages`
- `search_discord_messages`

## 3. 팀 공유용 `.mcp.json`

Claude Code는 프로젝트 루트 `.mcp.json`을 통한 project-scope 서버 공유를 지원하며 header 내부 환경변수 치환도 지원한다.

권장 예시:

```json
{
  "mcpServers": {
    "gyuniverse-discord": {
      "type": "http",
      "url": "https://gyuniverse-discord-bridge.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer ${GYUNIVERSE_MCP_TOKEN}"
      }
    }
  }
}
```

각 팀원 PC에는 secret만 환경변수로 설정한다.

PowerShell:

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<shared secret>"
```

영구 등록이 필요하면 Windows 사용자 환경변수 등 별도 안전한 저장 방식을 사용한다.

### 보안 원칙

- 실제 secret을 `.mcp.json`에 직접 적지 않는다.
- secret을 Git commit / Discord 공개 채널 / Notion 공개 문서에 기록하지 않는다.
- 프로젝트 `.mcp.json`에는 환경변수 참조만 저장한다.
- 팀원이 나가거나 secret 노출 가능성이 있으면 `MCP_SHARED_SECRET`을 회전한다.

## 4. Claude Code에서의 실제 팀 활용

예시 요청:

```text
우리 팀 Discord에서 API 응답 형식 관련해서 전에 결정한 내용 찾아줘.
```

```text
노트-자원과 일반 채널을 확인해서 현재 Backend 관련 결정 / 진행 / blocker를 정리해줘.
```

```text
Jira 관련 과거 Discord 논의를 검색해서 확정된 운영 규칙만 알려줘.
```

Claude Code가 코드 작업 중 같은 Remote MCP를 사용하면 ChatGPT와 Claude가 같은 Discord 원문을 공통 Evidence로 볼 수 있다.

목표 구조:

```text
                 Team Discord
                      |
              Remote MCP Bridge
                      |
        +-------------+-------------+
        |             |             |
     ChatGPT      Claude Code     Claude
        |             |             |
        +------ Same Evidence -------+
```

## 5. Claude.ai / Claude Desktop Remote Connector

Anthropic의 Remote Custom Connector는 Claude와 Claude Desktop에서 사용할 수 있다.

다만 현재 공식 Remote Connector 인증 모델은 주로 다음 두 방식이다.

- authless
- OAuth

현재 Bridge는 정적 Bearer `MCP_SHARED_SECRET`을 요구하므로 Claude Code처럼 임의 Authorization header를 직접 설정할 수 있는 클라이언트에서는 바로 사용 가능하지만, Claude.ai / Claude Desktop의 일반 Custom Connector UI에 그대로 팀 배포하기에는 인증 호환성 한계가 있다.

따라서 현재 판정:

```text
Claude Code                  READY
Claude / Claude Desktop      AUTH UPGRADE REQUIRED
```

## 6. Claude / Desktop까지 확장하려면

권장 방향은 MCP 인증을 OAuth 기반으로 확장하는 것이다.

목표:

```text
현재
Claude Code
   -> Bearer MCP_SHARED_SECRET
   -> Bridge

확장
Claude / Claude Desktop / Claude Code
   -> OAuth
   -> Bridge
```

OAuth 도입 시 검토 항목:

1. Authorization Server / Resource Server 구성
2. MCP OAuth metadata 제공
3. 사용자 또는 팀 단위 access control
4. token expiry / refresh
5. revocation
6. 최소 read-only scope
7. 향후 Discord write scope와 read scope 분리

초기 팀 실험에서는 OAuth 구현 전까지 Claude Code만 먼저 실사용하는 것이 가장 빠르다.

## 7. 인증 구조 장기안

장기적으로 shared secret 한 개를 팀 전체가 나누는 방식보다 사용자별 인증이 더 적합하다.

### v1 — 현재

```text
MCP_SHARED_SECRET 1개
-> 팀원이 동일 secret 사용
```

장점:

- 단순
- 빠르게 실험 가능

단점:

- 사용자별 revoke 불가
- 사용자 추적 어려움
- secret 공유 관리 필요

### v2 — 권장

```text
OAuth
-> 사용자별 access
-> read scopes
-> 선택적 write scopes
```

이 구조가 Claude.ai / Desktop, 향후 다른 MCP Client까지 확장하기에도 더 자연스럽다.

## 8. Claude 관련 테스트 체크리스트

### Claude Code

- [ ] `GYUNIVERSE_MCP_TOKEN` 환경변수 설정
- [ ] Remote MCP 추가
- [ ] `claude mcp list`에 표시
- [ ] `/mcp`에서 connected 확인
- [ ] 3개 Discord Tool 노출 확인
- [ ] `list_discord_channels` 실행
- [ ] 최근 메시지 조회
- [ ] 과거 `Jira` 검색
- [ ] Team Brief 생성

### Claude / Desktop

- [ ] OAuth 설계
- [ ] Custom Connector 인증 호환성 검증
- [ ] Connector 등록
- [ ] 도구별 enable/disable 검증
- [ ] 팀 배포 방식 검토

## 9. 현재 상태

- Remote MCP 배포: DONE
- Claude Code 연결 설계: DONE
- Claude Code 실제 팀원 연결: READY / 실사용 검증 필요
- Project-scope `.mcp.json` 설계: DONE
- Claude.ai Remote Connector: WAITING — OAuth 필요
- Claude Desktop Remote Connector: WAITING — OAuth 필요
- OAuth: BACKLOG

## 10. 다음 순서

1. 한 명의 Claude Code에서 현재 Remote MCP 연결 실사용 검증
2. Team Brief / history search 결과를 ChatGPT 결과와 비교
3. 팀원 배포 시 `.mcp.json` + 환경변수 방식 적용
4. 실제 사용 가치가 확인되면 OAuth 설계 착수
5. OAuth 이후 Claude.ai / Claude Desktop Custom Connector 연결
