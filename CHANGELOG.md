# Changelog

This changelog summarizes the public development journey. Workspace-specific validation data has intentionally been excluded.

## 2026-09-03 — Discord Bridge foundation

- Added Discord channel listing and recent-message reads.
- Added Discord history search.
- Added recent-message fallback when Discord search indexing is unavailable.
- Defined evidence-aware Team Context workflows for decisions, tasks, blockers, risks, and unresolved questions.

## 2026-09-04 — Multi-client and Team Context expansion

- Added Claude Code Remote MCP integration.
- Added OAuth, Dynamic Client Registration (DCR), and PKCE support for hosted MCP clients.
- Added Claude Chat connector validation and callback compatibility fixes.
- Added shared Team Context Snapshot.
- Added Team Brief and Delta Brief context contracts.
- Added example Decision Baseline / Decision Ledger context.
- Added signed Team State Checkpoints and deterministic state diffs.
- Added ChatGPT MCP OAuth callback support.

## Public distribution

- Removed workspace-specific identity maps, Jira reconciliation reports, real decision baselines, and live team briefs.
- Replaced hard-coded workspace identifiers with environment variables or example data.
- Added MIT License and public security guidance.
