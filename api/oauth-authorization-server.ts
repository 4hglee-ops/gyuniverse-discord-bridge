import { OAUTH_SCOPE, publicBaseUrl } from "../src/oauth/stateless.js";

function handle(): Response {
  const base = publicBaseUrl();
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      scopes_supported: [OAUTH_SCOPE],
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

export const GET = handle;
