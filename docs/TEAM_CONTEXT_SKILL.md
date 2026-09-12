# Gyuniverse Team Context Skill

This document defines a client-agnostic workflow for turning Discord evidence into conservative team context.

## Tool priority

```text
Current team state
→ get_team_brief_context

Current decisions / decision changes
→ get_decision_ledger_context

Changes since a prior point
→ get_team_delta_context

Create first state baseline
→ create_team_state_checkpoint

Compare with a previous state
→ compare_team_state_checkpoint

Raw evidence pack
→ get_team_context_snapshot

Specific historical evidence
→ search_discord_messages
```

## Evidence rules

- mentioned ≠ decided
- should do ≠ assigned
- intends to do ≠ completed
- artifact shared ≠ whole task complete
- role relevance ≠ actual assignee
- newer message ≠ automatic confirmed decision
- Discord username ≠ verified real-world identity
- recent silence ≠ cancellation of an existing confirmed decision

Do not confirm identity, ownership, completion, or decisions from inferred evidence alone.

## Decision Baseline

A confirmed decision remains active until explicit evidence shows it was superseded or rejected.

Public example source:

```text
src/context/decision-baseline.ts
docs/DECISION_BASELINE.example.md
```

The public distribution ships fictional baseline data only. Replace it with your own private configuration or validated workspace data.

## Team Brief

Recommended sections:

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

## Delta Brief

When a previous checkpoint exists, prefer deterministic state diff over re-inferring change from a recent time window.

```text
Previous checkpoint
      +
Current normalized state
      ↓
compare_team_state_checkpoint
      ↓
added / removed / status_changed / content_changed
```

Without a previous checkpoint, use a bounded Discord time window conservatively and report completeness limitations.

## Team State Checkpoint

The AI client interprets evidence into normalized state. The bridge validates and signs that state, then compares stable IDs deterministically.

Checkpoint tokens are signed, not encrypted. Never place passwords, API keys, OAuth tokens, or other secrets inside checkpoint state.

Signing uses the dedicated:

```text
MCP_OAUTH_SIGNING_SECRET
```

## Completeness / freshness

`historyComplete=false` means the retrieved Discord evidence is bounded and must not be described as full history.

`historyComplete=true` only describes the requested Discord window. It does not imply that external systems such as Jira, Notion, or GitHub were fully reconciled.

## Write boundary

This bridge is read-only for Discord. If combined with a write-capable external system, treat that write as a separate authorization and verification step.
