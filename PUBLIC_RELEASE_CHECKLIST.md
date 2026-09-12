# Public Release Checklist

Before publishing this repository:

- [ ] Run a full Git history secret scan (`gitleaks` or `trufflehog`).
- [ ] Confirm no real Discord guild/channel IDs are intentionally embedded in source or docs.
- [ ] Confirm no real team names, Jira account IDs, private issue snapshots, or workspace decisions remain.
- [ ] Confirm `.env` files are ignored and `.env.example` contains placeholders only.
- [ ] Confirm public docs use self-hosted example URLs instead of a private production endpoint.
- [ ] Confirm OAuth approval/signing secrets are configured separately in production.
- [ ] Run `pnpm install`, `pnpm typecheck`, and local smoke tests.
- [ ] Review generated OpenAPI output for private URLs or identifiers.
- [ ] Publish from sanitized history, not from the original private repository object with private PR diffs.
