import {
  ACCESS_TOKEN_TTL_SECONDS,
  AccessTokenPayload,
  AuthorizationCodePayload,
  canonicalMcpResource,
  nowSeconds,
  REFRESH_TOKEN_TTL_SECONDS,
  RefreshTokenPayload,
  sha256Base64Url,
  signEnvelope,
  verifyEnvelope,
} from "../../src/oauth/stateless.js";

function tokenError(error: string, description: string, status = 400): Response {
  return Response.json(
    { error, error_description: description },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

async function issueTokens(resource: string, scope: string, clientId: string): Promise<Response> {
  const now = nowSeconds();
  const accessPayload: AccessTokenPayload = {
    typ: "access_token",
    aud: resource,
    scope,
    sub: "gyuniverse-team",
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };
  const refreshPayload: RefreshTokenPayload = {
    typ: "refresh_token",
    aud: resource,
    scope,
    clientId,
    sub: "gyuniverse-team",
    iat: now,
    exp: now + REFRESH_TOKEN_TTL_SECONDS,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signEnvelope("gya", accessPayload),
    signEnvelope("gyrf", refreshPayload),
  ]);

  return Response.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

async function handleAuthorizationCode(form: FormData): Promise<Response> {
  const code = String(form.get("code") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeVerifier = String(form.get("code_verifier") ?? "");
  const resource = String(form.get("resource") ?? "");

  if (!code || !clientId || !redirectUri || !codeVerifier || !resource) {
    return tokenError("invalid_request", "Missing required token request parameters.");
  }
  if (resource !== canonicalMcpResource()) {
    return tokenError("invalid_target", "Unexpected resource parameter.");
  }

  const payload = await verifyEnvelope<AuthorizationCodePayload>(code, "gyac");
  if (!payload || payload.typ !== "authorization_code") {
    return tokenError("invalid_grant", "Authorization code is invalid.");
  }

  const now = nowSeconds();
  if (payload.exp <= now) return tokenError("invalid_grant", "Authorization code expired.");
  if (payload.clientId !== clientId) return tokenError("invalid_grant", "client_id mismatch.");
  if (payload.redirectUri !== redirectUri) return tokenError("invalid_grant", "redirect_uri mismatch.");
  if (payload.resource !== resource) return tokenError("invalid_grant", "resource mismatch.");

  const actualChallenge = await sha256Base64Url(codeVerifier);
  if (actualChallenge !== payload.codeChallenge) {
    return tokenError("invalid_grant", "PKCE verification failed.");
  }

  return issueTokens(payload.resource, payload.scope, payload.clientId);
}

async function handleRefreshToken(form: FormData): Promise<Response> {
  const refreshToken = String(form.get("refresh_token") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const resource = String(form.get("resource") ?? "");

  if (!refreshToken || !clientId || !resource) {
    return tokenError("invalid_request", "Missing refresh token request parameters.");
  }
  if (resource !== canonicalMcpResource()) {
    return tokenError("invalid_target", "Unexpected resource parameter.");
  }

  const payload = await verifyEnvelope<RefreshTokenPayload>(refreshToken, "gyrf");
  if (!payload || payload.typ !== "refresh_token") {
    return tokenError("invalid_grant", "Refresh token is invalid.");
  }
  if (payload.exp <= nowSeconds()) return tokenError("invalid_grant", "Refresh token expired.");
  if (payload.clientId !== clientId) return tokenError("invalid_grant", "client_id mismatch.");
  if (payload.aud !== resource) return tokenError("invalid_grant", "resource mismatch.");

  return issueTokens(payload.aud, payload.scope, payload.clientId);
}

async function handle(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return tokenError("invalid_request", "Expected application/x-www-form-urlencoded body.");
  }

  const grantType = String(form.get("grant_type") ?? "");
  if (grantType === "authorization_code") return handleAuthorizationCode(form);
  if (grantType === "refresh_token") return handleRefreshToken(form);
  return tokenError("unsupported_grant_type", "Supported grants: authorization_code, refresh_token.");
}

export const POST = handle;
