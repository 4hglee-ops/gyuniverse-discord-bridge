# Hosted MCP OAuth Integration

This project supports OAuth-protected Remote MCP for compatible hosted clients.

## Flow

```text
Hosted MCP client
      |
      | request without token
      v
/mcp -> 401 + resource_metadata
      |
      v
/.well-known/oauth-protected-resource
      |
      v
/.well-known/oauth-authorization-server
      |
      +--> /oauth/register   (DCR)
      +--> /oauth/authorize  (PKCE + approval)
      +--> /oauth/token
      |
      v
Authorization: Bearer <OAuth access token>
      |
      v
/mcp -> Discord read-only tools
```

## Scope

```text
discord:read
```

The bridge does not expose Discord create/edit/delete tools.

## Required production configuration

```text
PUBLIC_BASE_URL=https://your-discord-bridge.example.com
MCP_OAUTH_TEAM_CODE=<dedicated approval code>
MCP_OAUTH_SIGNING_SECRET=<dedicated high-entropy signing secret>
```

Keep `MCP_OAUTH_TEAM_CODE`, `MCP_OAUTH_SIGNING_SECRET`, and `MCP_SHARED_SECRET` as separate values in production.

## Client registration

The server supports public Dynamic Client Registration (DCR) with PKCE S256. Supported callback families include compatible hosted MCP clients and localhost loopback development flows as implemented in `src/oauth/stateless.ts`.

## Token lifetime

- authorization code: 120 seconds
- access token: 24 hours
- refresh token: 30 days

## v1 limitations

The OAuth implementation is stateless and intentionally lightweight. It does not provide a persistent authorization database, per-user revocation, refresh-token family invalidation, or durable audit history.

For larger deployments, add persistent authorization state and individual identity before treating the service as a multi-tenant authorization system.

## Connection

Use your own deployment URL:

```text
https://your-discord-bridge.example.com/mcp
```

Do not publish real approval codes, signing secrets, bearer secrets, access tokens, or refresh tokens in documentation, issues, screenshots, or source control.
