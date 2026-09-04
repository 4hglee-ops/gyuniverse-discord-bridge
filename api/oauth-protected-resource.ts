import { canonicalMcpResource, OAUTH_SCOPE, publicBaseUrl } from "../src/oauth/stateless.js";

function handle(): Response {
  return Response.json(
    {
      resource: canonicalMcpResource(),
      authorization_servers: [publicBaseUrl()],
      scopes_supported: [OAUTH_SCOPE],
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

export const GET = handle;
