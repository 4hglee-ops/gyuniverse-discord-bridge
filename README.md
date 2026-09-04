<div align="center">

# 🌌 Gyuniverse Discord Bridge

### Discord 팀 대화를 ChatGPT · Claude가 읽고 이해할 수 있게 연결하는 AI Context Bridge

<p>
  <img src="https://img.shields.io/badge/Discord-Read--Only-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord Read Only" />
  <img src="https://img.shields.io/badge/MCP-Remote%20HTTP-111111?style=flat-square" alt="Remote MCP" />
  <img src="https://img.shields.io/badge/ChatGPT-GPT%20Actions-10A37F?style=flat-square&logo=openai&logoColor=white" alt="ChatGPT GPT Actions" />
  <img src="https://img.shields.io/badge/Claude-MCP-D97757?style=flat-square" alt="Claude MCP" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

**한 번 연결한 Discord를 여러 AI 클라이언트에서 팀 공용 컨텍스트로 활용합니다.**

[빠른 연결](#-빠른-연결) · [지원 기능](#-지원-기능) · [활용 예시](#-활용-예시) · [문서](#-문서) · [보안](#-보안-원칙)

</div>

---

## ✨ 무엇을 하는 프로젝트인가요?

`gyuniverse-discord-bridge`는 팀 Discord의 대화를 **AI가 검색·요약·분석할 수 있는 읽기 전용 인터페이스**로 변환합니다.

Discord Bot이 접근 가능한 채널의 메시지를 공통 API / MCP 형태로 제공하고, ChatGPT와 Claude 같은 AI 클라이언트가 이를 팀 컨텍스트로 사용할 수 있게 합니다.

```text
                    Team Discord
                         │
                  Discord Bot 1개
                         │
            Gyuniverse Discord Bridge
              Discord → Common Context
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     ChatGPT GPTs    Claude Code   Claude Chat / Cowork
     GPT Actions      Remote MCP       OAuth MCP
```

> 핵심 목표는 **Discord에 흩어진 팀 대화를 AI가 근거 기반으로 다시 읽을 수 있게 만드는 것**입니다.

---

## 🚀 지원 기능

현재 Discord 연동은 **Read-Only**입니다.

| 기능 | 설명 |
| --- | --- |
| 📚 채널 목록 조회 | Bot이 접근 가능한 Discord 채널 확인 |
| 💬 최근 메시지 조회 | 특정 채널의 최신 대화 조회 |
| 🔎 과거 메시지 검색 | 키워드 기반 Discord 히스토리 검색 |
| 🧠 팀 상태 브리핑 | 여러 채널을 읽고 결정·작업·Blocker·질문 등을 구조화 |
| 🧾 Evidence 기반 답변 | 실제 Discord 메시지를 근거로 판단하도록 AI에 컨텍스트 제공 |
| 🔌 Multi-client 연결 | ChatGPT GPTs, Claude Code, Claude Chat / Cowork 지원 |

### 현재 제공하지 않는 기능

```text
Discord 메시지 작성
Discord 메시지 수정
Discord 메시지 삭제
```

AI가 팀 대화를 **읽는 것과 팀 Discord를 조작하는 것을 분리**하는 방향을 유지합니다.

---

## ⚡ 빠른 연결

### Production Remote MCP

```text
https://gyuniverse-discord-bridge.vercel.app/mcp
```

### ChatGPT GPTs

Custom GPT에서는 **GPT Actions / OpenAPI** 방식으로 연결합니다.

```text
OpenAPI Schema
https://gyuniverse-discord-bridge.vercel.app/api/gpt/openapi

Authentication
API Key → Bearer
```

정상 연결 시 사용할 수 있는 Action:

```text
listDiscordChannels
getRecentDiscordMessages
searchDiscordMessages
```

상세 설정은 [`docs/TEAM_AI_CONNECTION_QUICKSTART.md`](docs/TEAM_AI_CONNECTION_QUICKSTART.md)를 참고하세요.

---

### Claude Code

Remote HTTP MCP + Bearer Header 방식입니다.

#### Windows PowerShell

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"

claude mcp add --transport http gyuniverse-discord \
  https://gyuniverse-discord-bridge.vercel.app/mcp \
  --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

연결 확인:

```powershell
claude mcp list
```

정상 연결 시 Tool:

```text
list_discord_channels
get_recent_discord_messages
search_discord_messages
```

---

### Claude Chat / Cowork

Claude의 Custom Connector에서 Remote MCP를 등록합니다.

```text
Name
Gyuniverse Discord

MCP Server URL
https://gyuniverse-discord-bridge.vercel.app/mcp

Authentication
항상 필요

OAuth Client
클라이언트 ID 없음 — 자동 등록
```

Bridge는 **OAuth Dynamic Client Registration(DCR)** 을 지원하며, 연결 과정에서 팀 접근 코드를 입력합니다.

현재 OAuth Scope:

```text
discord:read
```

---

## 💡 활용 예시

연결 후 AI에게 자연어로 바로 요청할 수 있습니다.

### 팀 대화 요약

```text
노트-자원 채널 최근 메시지 20개 읽어서 중요한 내용만 요약해줘.
```

### 과거 논의 찾기

```text
Discord 전체에서 Jira가 언급된 과거 메시지를 찾아줘.
작성자, 채널, 시간과 함께 중요한 내용만 정리해줘.
```

### 현재 팀 상태 브리핑

```text
Discord를 확인해서 현재 팀 상황을

- 확정된 결정
- 진행 중 작업
- 담당 작업
- Blocker
- 미응답 질문
- 미확정 제안

으로 나눠서 정리해줘.
```

### 결정과 제안 구분

```text
최근 Discord 대화를 기존 Decision Baseline과 대조해서
확정된 결정과 아직 열린 제안을 구분해줘.
```

### 변경 사항 추적

```text
지난 24시간 동안 새 결정, 변경된 결정, 새 작업,
진행 변화, Blocker, 질문, 제안만 정리해줘.
```

---

## 🧠 이 Bridge를 쓰는 이유

일반적인 AI 채팅은 팀의 실제 대화를 자동으로 알지 못합니다.

이 Bridge를 사용하면 AI가 다음과 같은 질문에 **Discord 근거를 직접 확인한 뒤 답할 수 있습니다.**

```text
"이거 우리 팀에서 결정한 거 맞아?"
"누가 이 작업 맡았지?"
"Jira 운영 방식 마지막으로 어떻게 정했어?"
"어제 이후 달라진 게 뭐야?"
"이 제안은 확정된 건가 아직 논의 중인가?"
```

즉, Discord를 단순 채팅 기록이 아니라 **팀의 실행 가능한 AI Context Source**로 바꾸는 것이 프로젝트의 방향입니다.

---

## 🏗️ Architecture

```text
Discord API
    │
    ▼
discord.js
    │
    ▼
BridgeMessage / Discord Context Layer
    │
    ├── Channel Listing
    ├── Recent Messages
    └── History Search
    │
    ▼
Gyuniverse Bridge
    │
    ├── Remote MCP
    │     ├── Claude Code
    │     └── Claude Chat / Cowork
    │
    └── GPT Actions API
          └── ChatGPT GPTs
```

### Tech Stack

| 영역 | 기술 |
| --- | --- |
| Language | TypeScript |
| Discord | discord.js |
| MCP | `@modelcontextprotocol/node`, `@modelcontextprotocol/server` |
| Validation | Zod |
| Runtime | Node.js |
| Package Manager | pnpm |
| Deployment | Vercel |

---

## 🧪 Smoke Test

어떤 AI Client든 아래 3개가 되면 기본 연결 성공으로 봅니다.

```text
1. Discord 채널 목록 조회
2. 특정 채널 최근 메시지 조회
3. 과거 메시지 키워드 검색
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

## 📚 문서

| 문서 | 설명 |
| --- | --- |
| [`TEAM_AI_CONNECTION_QUICKSTART.md`](docs/TEAM_AI_CONNECTION_QUICKSTART.md) | ⭐ 팀원용 ChatGPT / Claude 연결 Quick Start |
| [`GPT_INSTRUCTIONS.md`](docs/GPT_INSTRUCTIONS.md) | ChatGPT GPT용 권장 Instructions |
| [`CLAUDE_INTEGRATION.md`](docs/CLAUDE_INTEGRATION.md) | Claude MCP 통합 상세 가이드 |
| [`CLAUDE_CHAT_COWORK_OAUTH.md`](docs/CLAUDE_CHAT_COWORK_OAUTH.md) | Claude Chat / Cowork OAuth 연결 구조 |
| [`CLAUDE_CHAT_COWORK_LIVE_VALIDATION.md`](docs/CLAUDE_CHAT_COWORK_LIVE_VALIDATION.md) | 실제 연결 검증 기록 |
| [`DECISION_BASELINE.md`](docs/DECISION_BASELINE.md) | 팀의 확정 의사결정 기준선 |
| [`IDENTITY_MAP.md`](docs/IDENTITY_MAP.md) | Discord 사용자와 팀 역할 식별 보조 자료 |

---

## 🔐 보안 원칙

이 저장소는 팀 Discord 대화를 AI가 읽을 수 있게 연결하기 때문에 **Secret 관리가 특히 중요합니다.**

### 절대 Git에 올리지 않는 값

```text
Discord Bot Token
MCP_SHARED_SECRET
MCP_OAUTH_TEAM_CODE
GPT Actions API Key
OAuth 관련 Secret
```

Secret은 `.env` 또는 배포 플랫폼의 Environment Variables로 관리하고, 팀원에게 전달할 때도 공개 채널이나 저장소 문서에 직접 기록하지 않습니다.

> 하나의 shared secret을 여러 사람에게 공유하면 해당 secret이 허용하는 Bridge 권한도 함께 공유됩니다. 팀 규모가 커질수록 사용자별 인증·권한 분리를 고려하는 것이 좋습니다.

---

## 🛠️ Local Development

```bash
git clone https://github.com/4hglee-ops/gyuniverse-discord-bridge.git
cd gyuniverse-discord-bridge
pnpm install
```

환경 변수 설정 후 개발 서버 실행:

```bash
pnpm dev
```

TypeScript 확인:

```bash
pnpm typecheck
```

STDIO MCP 실행:

```bash
pnpm mcp:stdio
```

---

## 🗺️ Direction

현재는 **Discord Read → AI Context**에 집중합니다.

앞으로 확장 가능한 방향:

```text
Discord
   + Jira
   + GitHub
   + Notion
      │
      ▼
Unified Team Context
      │
      ▼
Decision / Work / Blocker / Question / Proposal
      │
      ▼
AI Team Intelligence Layer
```

단순 메시지 검색기를 넘어, 여러 협업 도구의 현재 상태와 과거 결정을 연결해 **“팀에서 실제로 무엇이 결정됐고 무엇이 바뀌었는가”를 추적하는 Context Infrastructure**로 발전시키는 것이 장기적인 확장 방향입니다.

---

<div align="center">

### 🌌 Gyuniverse

**Turn team conversations into shared AI context.**

</div>
