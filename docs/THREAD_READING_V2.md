# Discord 일반 스레드 읽기 (개발 브랜치)

GPT Actions 새 엔드포인트: `GET /api/gpt/v1/threads`, `GET /api/gpt/v1/thread-messages` (OpenAPI `/api/gpt/openapi`). GPT Actions 검색에도 `includeThreads=true` 추가.

MCP 신규 도구:
- `list_channel_threads`: `channelId`(부모 텍스트 채널), 선택 `serverId`, `status=active|archived|all`, `archiveLimit`, 보관 페이지 커서 `beforePublic` / `beforePrivate`.
- `get_thread_messages`: `parentChannelId` 및 `threadId`, 선택 `serverId`, `limit`, `before` (메시지 ID), `includeStarter`. 반환: 스레드 메타정보, 메시지(오래된 순), 부모 시작 메시지(있을 경우), `nextBefore`, `historyComplete`.
- `search_discord_messages` 신규 옵션 `includeThreads: true`: 권한 허용된 부모 채널의 스레드 ID를 검색 범위에 추가. 최대 10개 부모 채널에서 활성 스레드와 첫 보관 페이지(공개·가입한 비공개)만 수집. `threadSearch.scopeComplete=false`면 다른 스레드에 결과가 있을 수 있음. 기본값 false(기존 검색 호환).

## 보안
- 스레드 관련 Discord API 호출 전에 부모 채널 ACL 확인.
- 비공개 스레드는 활성 목록 중 봇 membership 응답이 있거나, 보관 시 봇이 참가한 것만 열거.
- 직접 비공개 스레드 ID를 지정한 경우 `thread-members/@me` 검증.
- 다른 Guild 또는 다른 부모 채널 스레드 ID를 거부.
- 새로운 Discord 쓰기 권한 / DB 마이그레이션 / OAuth Secret 변경 없음.

## 테스트 및 운영 검증
`pnpm install --frozen-lockfile && pnpm typecheck && pnpm test` 를 통과시킨 다음 개발 Discord 서버에서 실제 Bot의 Read Message History, View Channel, 비공개 스레드 membership을 확인해야 함.

**주의**: 아직 PR 검토/CI 및 실제 봇 호출을 통과했다고 주장할 수 없음. v2 사용자 ACL 개발 브랜치에 의존하므로 현 Production에는 직접 병합하지 말 것.

## 호출 예시

```text
list_channel_threads(channelId="부모채널ID", status="all")
get_thread_messages(parentChannelId="부모채널ID", threadId="스레드ID", limit=50)
search_discord_messages(query="멀티턴", channelId="LLM채널ID", includeThreads=true)
```

일반 스레드가 많은 채널에서는 검색 범위가 제한될 수 있으므로 특정 스레드를 확인하려면 `get_thread_messages`가 더 확실합니다.
