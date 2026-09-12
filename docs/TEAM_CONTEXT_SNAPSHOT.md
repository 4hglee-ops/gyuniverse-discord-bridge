# Team Context Snapshot

`Team Context Snapshot` gives Team Brief, Decision Ledger, and Delta workflows one shared Discord evidence pack instead of independently fetching channels in different ways.

```text
Discord channels
      ↓
Team Context Snapshot
      ↓
Team Brief / Decision Ledger / Delta Brief
```

The snapshot does not decide what is confirmed, assigned, complete, or blocked. It provides evidence and retrieval metadata.

## MCP tool

```text
get_team_context_snapshot
```

Example input:

```json
{
  "channelIds": ["optional-channel-id"],
  "since": "2026-01-01T00:00:00Z",
  "perChannelLimit": 50
}
```

- `channelIds`: optional; omit to include all accessible text channels
- `since`: optional time boundary
- `perChannelLimit`: 1–100, default 50

## GPT Actions

```text
GET /api/gpt/v1/context-snapshot
operationId: getTeamContextSnapshot
```

Example query:

```text
channelIds=channel-a,channel-b
since=2026-01-01T00:00:00Z
perChannelLimit=50
```

## Response shape

```text
snapshotAt
source
server
scope
freshness
completeness
channels[]
authors[]
messageCount
messages[]
```

## Freshness

`newestMessageAt` identifies the newest Discord evidence included in the snapshot.

## Completeness

`historyComplete` is meaningful only when a `since` boundary is supplied.

A channel window is complete when the fetch reached the requested time boundary or exhausted the available recent history. If the fetch hits `perChannelLimit` before reaching the boundary, more messages may exist and the window is incomplete.

Without `since`, the snapshot is intentionally a bounded recent view and must not be described as complete Discord history.

## Recommended Team Brief flow

1. Create snapshot
2. Inspect freshness/completeness
3. Apply evidence rules
4. Build decisions/work/blockers/questions/proposals
5. Search specific history only when the snapshot is insufficient

## Current limitations

- Thread/reply relationships are not yet represented in `BridgeMessage`.
- Recent fetches are bounded to 100 messages per channel.
- Snapshot covers Discord only; external source reconciliation belongs in another layer.
- Snapshot itself performs no LLM inference.
