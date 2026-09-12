# Team Collaboration Workflows

This document defines generic evidence rules for using Discord as a Team Context source.

## Evidence Model

### Primary Evidence

- a person directly reports their own progress or completion
- an actual artifact, PR, document, screenshot, or result is shared
- an explicit team agreement is recorded

### Secondary Evidence

- meeting summaries
- lead/member status summaries
- a teammate relays someone else's state

### Inferred Evidence

- a task appears related to someone's role
- a username appears to correspond to a person
- an artifact link looks like completion without an explicit statement

Inferred evidence alone must not confirm identity, assignment, completion, or decisions.

## Decision Ledger

States:

```text
confirmed
proposed
superseded
rejected
unclear
```

Rules:

1. One person's idea is not automatically a confirmed decision.
2. Strong agreement language and repeated operational use are stronger evidence.
3. Preserve prior decisions as history when they are superseded.
4. A newer message may still be only a proposal.
5. If the reason for a decision is not present in evidence, do not invent it.

## Task Candidate

States:

```text
candidate
assigned
in_progress
completion_candidate
done
blocked
cancelled
```

Rules:

- “should do” → candidate
- “I will do it” → assigned
- “working on it” → in progress
- “done” → completion candidate until sufficiently verified
- strong artifact/result evidence → done
- never invent an assignee

## Blocker / Risk

A blocker actually prevents progress. A risk may affect schedule or quality but does not currently stop work.

## Unresolved Question

Classify questions as open, answered, resolved-by-action, or stale when evidence supports that distinction.

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
11. Evidence / Freshness

## External write boundary

This Discord Bridge is read-only. If you combine it with Jira, GitHub, Notion, or other write-capable systems, treat external writes as a separate authorization step. Never infer an assignee or destructive action solely from Discord context.
