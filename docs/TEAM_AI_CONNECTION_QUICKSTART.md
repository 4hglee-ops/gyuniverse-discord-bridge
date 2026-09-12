# AI Client Connection Quick Start

This guide assumes you deployed Gyuniverse Discord Bridge yourself.

Use your own origin throughout this document:

```text
https://your-discord-bridge.example.com
```

## Remote MCP

Endpoint:

```text
https://your-discord-bridge.example.com/mcp
```

### Static bearer client

```powershell
$env:GYUNIVERSE_MCP_TOKEN = "<MCP_SHARED_SECRET>"
claude mcp add --transport http gyuniverse-discord https://your-discord-bridge.example.com/mcp --header "Authorization: Bearer $env:GYUNIVERSE_MCP_TOKEN"
```

Do not put the real secret in `.mcp.json`, source code, screenshots, issues, or documentation.

## OAuth-capable MCP clients

The bridge exposes OAuth protected-resource and authorization-server metadata and supports public DCR + PKCE clients.

Required production environment values:

```text
PUBLIC_BASE_URL
MCP_OAUTH_TEAM_CODE
MCP_OAUTH_SIGNING_SECRET
```

The OAuth scope is read-only:

```text
discord:read
```

## GPT Actions

OpenAPI schema:

```text
https://your-discord-bridge.example.com/api/gpt/openapi
```

Authentication:

```text
API Key / Bearer
```

Use `GPT_ACTIONS_API_KEY`, separate from `MCP_SHARED_SECRET`.

## Basic smoke tests

Ask the client to:

```text
List accessible Discord text channels.
```

```text
Read the latest messages from one test channel and summarize them.
```

```text
Search history for a keyword and tell me whether the result is complete or recent-fallback only.
```

## Security boundary

This project intentionally exposes Discord read/search capabilities only. It does not provide message create/edit/delete tools.
