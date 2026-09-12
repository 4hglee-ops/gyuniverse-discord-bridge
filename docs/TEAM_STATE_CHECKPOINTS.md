# Team State Checkpoints

Team State Checkpoints allow a client to compare normalized team state instead of inferring every change from a recent message window.

```text
Checkpoint A
   ↓
Current normalized state
   ↓
Deterministic diff
   ↓
Checkpoint B
```

## Responsibility split

### AI client

Interpret Discord evidence into normalized categories:

```text
decisions
work
blockers
questions
proposals
```

Each item should have a stable ID, status, summary, and evidence references.

### Bridge

- validate normalized state
- create signed checkpoint token
- verify a previous checkpoint
- calculate stable-ID-based diff
- return the next checkpoint token

Diff kinds:

```text
added
removed
status_changed
content_changed
```

## Tools

```text
create_team_state_checkpoint
compare_team_state_checkpoint
```

GPT Actions equivalents:

```text
createTeamStateCheckpoint
compareTeamStateCheckpoint
```

## Signing

Checkpoint tokens use HMAC SHA-256 with:

```text
MCP_OAUTH_SIGNING_SECRET
```

Use a dedicated high-entropy signing secret in production.

A checkpoint token detects tampering; it is not encrypted storage. Never put passwords, API keys, bearer credentials, OAuth tokens, or sensitive raw message content into normalized checkpoint state unless you are comfortable with the token payload being readable.

## Example transition

```text
work:api-integration
in_progress -> completion_candidate
```

```text
blocker:test-environment
open -> resolved
```

```text
decision:deployment-platform
proposed -> confirmed
```

## v1 limitations

- checkpoint tokens are not stored by the server
- the client/conversation must retain the prior token
- stable-ID quality depends on the normalization layer
- persistent history and revocation are future extensions
