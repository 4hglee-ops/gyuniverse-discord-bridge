# Gyuniverse Team Context Skill

기준일: 2026-09-04

이 문서는 ChatGPT GPTs와 Claude가 동일한 방식으로 Discord Team Context를 읽고 Team Brief / Delta Brief / Decision Ledger를 생성하기 위한 공통 실행 규약이다.

## 1. Source 우선순위

Discord 질문은 추측하지 않고 실제 Bridge 도구를 사용한다.

### 현재 팀 상태 / 브리핑

우선:

```text
get_team_brief_context
// GPT Actions: getTeamBriefContext
```

필요한 과거 결정 근거만:

```text
search_discord_messages
// GPT Actions: searchDiscordMessages
```

### 무엇이 바뀌었는지

우선:

```text
get_team_delta_context
// GPT Actions: getTeamDeltaContext
```

사용 예:

- 어제 이후 뭐 바뀌었어?
- 오늘 새로 결정된 거 있어?
- 회의 이후 진행 상황만 알려줘.
- 지난 12시간 새 Blocker 있어?

### 원본 Evidence Pack만 필요한 경우

```text
get_team_context_snapshot
// GPT Actions: getTeamContextSnapshot
```

### 특정 과거 사실/결정 찾기

```text
search_discord_messages
```

---

## 2. Evidence 규칙

반드시 아래를 지킨다.

- `얘기했다` ≠ `결정했다`
- `해야 한다` ≠ `내가 한다`
- `하겠다` ≠ `완료했다`
- `자료를 공유했다` ≠ `전체 작업이 완료됐다`
- 역할상 관련 있어 보임 ≠ 실제 담당자로 배정됨
- 한 사람의 아이디어 ≠ 팀 결정
- 최신 메시지 ≠ 자동으로 최신 confirmed decision
- Discord username ≠ 실제 사람 이름 (검증된 Identity Map 필요)

### Evidence 수준

**Primary**
- 당사자 직접 진행/완료/담당 확인
- 실제 결과물 링크/파일/PR/화면
- 명시적인 팀 합의

**Secondary**
- 회의록 요약
- 팀장/다른 팀원의 현황 요약

**Inferred**
- 역할상 담당으로 보임
- 이름이 비슷함
- 링크 공유만으로 완료처럼 보임

Inferred Evidence만으로 사람/완료/결정을 확정하지 않는다.

---

## 3. Team Brief v2

사용자가 현재 팀 상태, 브리핑, 전체 진행 상황을 요청하면 `get_team_brief_context` 결과의 `contract.sections`를 따른다.

기본 출력 순서:

1. Current Decisions
2. What Changed
3. In Progress
4. Assigned Work
5. Unassigned Work
6. Blockers
7. Risks
8. Unresolved Questions
9. Proposals
10. Decisions Needed Next
11. State Gaps
12. Evidence / Freshness

### 출력 원칙

- 중요하지 않은 빈 섹션은 생략 가능
- 현재 상태와 과거 이력을 분리
- Blocker와 Risk를 구분
- 완료 언급만 있으면 completion candidate
- 실제 결과 Evidence가 있으면 done
- 담당자가 명시되지 않았으면 임의 배정 금지
- 결정 상태는 `confirmed / proposed / superseded / rejected / unclear`

### Search 보완 조건

Snapshot만으로 충분하면 Search하지 않는다.

다음 경우만 과거 검색을 보완한다.

- 결정 이유가 필요함
- 변경 이력이 필요함
- 상충 메시지가 존재함
- 완료/담당 Evidence가 부족함
- 사용자가 과거 전체를 요구함

---

## 4. Delta Brief v1

Delta Brief는 전체 현황을 다시 쓰지 않는다.

기본 질문:

```text
어제 이후 뭐 바뀌었어?
```

기본 window는 24시간이며 사용자가 기준시각/기간을 지정하면 그것을 사용한다.

출력 순서:

1. New Decisions
2. Changed Decisions
3. New Tasks
4. Progress Changes
5. Completion Candidates
6. New Blockers
7. Resolved Blockers
8. New Questions
9. Resolved Questions
10. New Proposals
11. Evidence / Freshness

변화가 없는 섹션은 생략하거나 짧게 `없음`으로 표시한다.

### 중요

Delta window 안에 "해결됨", "끝남", "기존 결정 변경" 같은 문장이 있어도 이전 상태가 무엇이었는지 필요한 경우 Search로 이전 Evidence를 확인한다.

예:

```text
현재: "PostgreSQL로 하기로 했어"
```

만 보고 `changed decision`으로 확정하지 않는다.

이전 결정이 MySQL이었는지, 단순 후보였는지 Search로 확인할 수 있다.

---

## 5. Decision Ledger

Decision 요청은 다음 상태를 사용한다.

```text
confirmed
proposed
superseded
rejected
unclear
```

권장 필드:

```text
Topic
Current Decision
Status
Effective Since
People
Primary Evidence
Secondary Evidence
Previous Decision
Change History
Reason
History Completeness
```

`confirmed decision`과 `implementation done`은 별개다.

예:

```text
Jira → Branch → PR → Review → Merge → Done
```

이라는 운영 규칙이 confirmed여도 실제 E2E 검증 작업은 미완료일 수 있다.

---

## 6. Completeness / Freshness

항상 Snapshot metadata를 해석한다.

### historyComplete = false

아래처럼 표현한다.

```text
최근 조회 범위 기준이며, 과거 전체 기록을 모두 확인한 것은 아닙니다.
```

### historyComplete = true

지정된 `since` 경계까지 각 채널을 충분히 확인했다는 의미다.

단, Discord 외부 시스템(Notion/Jira/GitHub)의 전체 사실까지 확인했다는 의미는 아니다.

---

## 7. Tool 선택 요약

```text
현재 팀 상황
→ get_team_brief_context

어제/회의 이후 변화
→ get_team_delta_context

원본 메시지 묶음
→ get_team_context_snapshot

과거 특정 결정/근거
→ search_discord_messages

특정 채널 최근 내용
→ get_recent_discord_messages

채널 찾기
→ list_discord_channels
```

---

## 8. Write 원칙

이 Skill은 현재 Discord read-only다.

- Discord write/delete 없음
- Jira/Notion/GitHub 변경은 별도 연결에서 실행 가능하더라도 먼저 후보를 제시
- 실제 write는 사용자의 명시적인 실행 요청 후 수행
- delete/bulk destructive 변경은 별도 강한 승인 필요
