# Security Policy

## Secrets

Never commit Discord bot tokens, MCP bearer secrets, OAuth approval codes, OAuth signing secrets, GPT Actions API keys, or deployment credentials.

Use environment variables or your deployment platform's encrypted secret store.

## Production recommendations

- Use a dedicated `MCP_SHARED_SECRET` for static bearer access.
- Use a different `MCP_OAUTH_TEAM_CODE` for the OAuth approval screen.
- Use a separate high-entropy `MCP_OAUTH_SIGNING_SECRET` for signed OAuth/checkpoint envelopes.
- Restrict the Discord bot to the minimum guild/channel permissions required.
- Keep the bridge read-only unless you intentionally design, review, and authorize write capabilities.
- Rotate credentials immediately if a secret is exposed.

## Public repository boundary

This distribution contains no production workspace identities, team decision records, private Discord messages, or deployment secrets. Keep workspace-specific data in private configuration or a separate private repository.

## Reporting

If you discover a security issue, do not post credentials or exploit details in a public issue. Contact the repository owner privately first.
