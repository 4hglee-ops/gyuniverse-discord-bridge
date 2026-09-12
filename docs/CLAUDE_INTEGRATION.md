# Claude / Claude Code Integration

Use your own bridge deployment URL throughout this guide.

```text
https://your-discord-bridge.example.com/mcp
```

## Claude Code — static bearer

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"
claude mcp add --transport http gyuniverse-discord https://your-discord-bridge.example.com/mcp --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

For project-scoped configuration, use `.mcp.json.example` and keep only an environment-variable reference in version control.

## OAuth-capable hosted connector

The bridge also exposes OAuth metadata and supports public DCR + PKCE clients. Configure:

```text
PUBLIC_BASE_URL
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
```

OAuth scope:

```text
discord:read
```

## Security

- never commit bearer secrets or OAuth secrets
- use different values for static bearer auth, approval code, and signing secret
- rotate credentials after suspected exposure
- keep the Discord bot least-privileged and read-only
