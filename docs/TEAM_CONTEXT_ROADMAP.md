# Team Context Roadmap

This public roadmap describes product capabilities, not a private team's live project status.

## Completed foundation

- Discord channel listing
- recent-message reads
- history search with recent-message fallback
- Remote MCP
- GPT Actions / OpenAPI adapter
- OAuth DCR + PKCE support
- Team Context Snapshot
- Team Brief / Decision / Delta workflow contracts
- signed Team State Checkpoints
- deterministic state diff

## Next

- Thread / reply relationship metadata
- Evidence permalinks
- persistent checkpoint storage
- stronger per-user identity and revocation
- configurable private Decision Baseline source
- broader source reconciliation adapters

## Long-term direction

```text
Discord evidence
      +
other collaboration sources
      ↓
normalized team state
      ↓
traceable AI assistance
```

The read layer and any future write layer should remain separately authorized.
