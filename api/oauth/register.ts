import {
  isAllowedRedirectUri,
  nowSeconds,
  RegisteredClientPayload,
  signEnvelope,
} from "../../src/oauth/stateless.js";

interface RegistrationRequest {
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
}

async function handle(request: Request): Promise<Response> {
  let body: RegistrationRequest;
  try {
    body = (await request.json()) as RegistrationRequest;
  } catch {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  console.log("OAuth DCR request", {
    clientName: body.client_name,
    redirectUris: body.redirect_uris,
    tokenEndpointAuthMethod: body.token_endpoint_auth_method,
    grantTypes: body.grant_types,
    responseTypes: body.response_types,
  });

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirectUri)) {
    return Response.json(
      { error: "invalid_redirect_uri", error_description: "Unsupported redirect URI." },
      { status: 400 },
    );
  }

  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "Only public PKCE clients are supported." },
      { status: 400 },
    );
  }

  const requestedGrants = body.grant_types ?? ["authorization_code", "refresh_token"];
  if (requestedGrants.some((grant) => grant !== "authorization_code" && grant !== "refresh_token")) {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  if (!requestedGrants.includes("authorization_code")) {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  if (body.response_types?.some((type) => type !== "code")) {
    return Response.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const payload: RegisteredClientPayload = {
    typ: "registered_client",
    redirectUris,
    clientName: body.client_name?.slice(0, 120),
    iat: nowSeconds(),
  };
  const clientId = await signEnvelope("gyrc", payload);

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: payload.iat,
      client_name: payload.clientName ?? "Gyuniverse MCP client",
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: requestedGrants,
      response_types: ["code"],
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export const POST = handle;
