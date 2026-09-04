import {
  AUTH_CODE_TTL_SECONDS,
  AuthorizationCodePayload,
  canonicalMcpResource,
  normalizeScope,
  nowSeconds,
  oauthTeamCode,
  RegisteredClientPayload,
  scopeIsAllowed,
  signEnvelope,
  verifyEnvelope,
} from "../../src/oauth/stateless.js";

interface AuthorizationParams {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  scope: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paramsFromUrl(url: URL): AuthorizationParams {
  return {
    responseType: url.searchParams.get("response_type") ?? "",
    clientId: url.searchParams.get("client_id") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? "",
    state: url.searchParams.get("state") ?? "",
    codeChallenge: url.searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: url.searchParams.get("code_challenge_method") ?? "",
    resource: url.searchParams.get("resource") ?? "",
    scope: normalizeScope(url.searchParams.get("scope")),
  };
}

async function paramsFromForm(request: Request): Promise<{ params: AuthorizationParams; teamCode: string }> {
  const form = await request.formData();
  return {
    params: {
      responseType: String(form.get("response_type") ?? ""),
      clientId: String(form.get("client_id") ?? ""),
      redirectUri: String(form.get("redirect_uri") ?? ""),
      state: String(form.get("state") ?? ""),
      codeChallenge: String(form.get("code_challenge") ?? ""),
      codeChallengeMethod: String(form.get("code_challenge_method") ?? ""),
      resource: String(form.get("resource") ?? ""),
      scope: normalizeScope(String(form.get("scope") ?? "")),
    },
    teamCode: String(form.get("team_code") ?? ""),
  };
}

async function validate(params: AuthorizationParams): Promise<string | null> {
  if (params.responseType !== "code") return "Only response_type=code is supported.";
  if (!params.clientId || !params.redirectUri || !params.codeChallenge) return "Missing required OAuth parameters.";
  if (params.codeChallengeMethod !== "S256") return "PKCE S256 is required.";
  if (params.resource !== canonicalMcpResource()) return "Invalid resource parameter.";
  if (!scopeIsAllowed(params.scope)) return "Unsupported scope.";

  const client = await verifyEnvelope<RegisteredClientPayload>(params.clientId, "gyrc");
  if (!client || client.typ !== "registered_client") return "Invalid client_id.";
  if (!client.redirectUris.includes(params.redirectUri)) return "redirect_uri was not registered for this client.";
  return null;
}

function approvalPage(params: AuthorizationParams, error?: string): Response {
  const hidden = [
    ["response_type", params.responseType],
    ["client_id", params.clientId],
    ["redirect_uri", params.redirectUri],
    ["state", params.state],
    ["code_challenge", params.codeChallenge],
    ["code_challenge_method", params.codeChallengeMethod],
    ["resource", params.resource],
    ["scope", params.scope],
  ]
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
    .join("\n");

  const errorHtml = error ? `<p style="color:#b42318;font-weight:600">${escapeHtml(error)}</p>` : "";

  return new Response(
    `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gyuniverse Discord 연결 승인</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f6f7f9;margin:0;padding:32px;color:#111827">
<main style="max-width:520px;margin:48px auto;background:white;padding:28px;border-radius:14px;border:1px solid #e5e7eb">
<h1 style="font-size:22px;margin-top:0">Gyuniverse Discord 연결 승인</h1>
<p>Claude Chat / Cowork가 팀 Discord의 읽기 전용 도구에 접근하려고 합니다.</p>
<ul>
<li>채널 목록 조회</li>
<li>최근 메시지 조회</li>
<li>과거 메시지 검색</li>
</ul>
<p><strong>쓰기·삭제 권한은 포함되지 않습니다.</strong></p>
${errorHtml}
<form method="post" action="/oauth/authorize">
${hidden}
<label style="display:block;font-weight:600;margin:18px 0 8px">팀 접근 코드</label>
<input type="password" name="team_code" autocomplete="off" required style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px">
<button type="submit" style="margin-top:18px;padding:10px 16px;border:0;border-radius:8px;background:#111827;color:white;font-weight:600">연결 승인</button>
</form>
</main>
</body>
</html>`,
    {
      status: error ? 403 : 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}

async function get(request: Request): Promise<Response> {
  const params = paramsFromUrl(new URL(request.url));
  const error = await validate(params);
  if (error) return new Response(error, { status: 400 });
  return approvalPage(params);
}

async function post(request: Request): Promise<Response> {
  let parsed: { params: AuthorizationParams; teamCode: string };
  try {
    parsed = await paramsFromForm(request);
  } catch {
    return new Response("Invalid form submission.", { status: 400 });
  }

  const error = await validate(parsed.params);
  if (error) return new Response(error, { status: 400 });

  const expectedTeamCode = oauthTeamCode();
  if (!expectedTeamCode || parsed.teamCode !== expectedTeamCode) {
    return approvalPage(parsed.params, "팀 접근 코드가 올바르지 않습니다.");
  }

  const now = nowSeconds();
  const payload: AuthorizationCodePayload = {
    typ: "authorization_code",
    clientId: parsed.params.clientId,
    redirectUri: parsed.params.redirectUri,
    resource: parsed.params.resource,
    scope: parsed.params.scope,
    codeChallenge: parsed.params.codeChallenge,
    iat: now,
    exp: now + AUTH_CODE_TTL_SECONDS,
  };

  const code = await signEnvelope("gyac", payload);
  const redirect = new URL(parsed.params.redirectUri);
  redirect.searchParams.set("code", code);
  if (parsed.params.state) redirect.searchParams.set("state", parsed.params.state);

  return Response.redirect(redirect.toString(), 302);
}

export const GET = get;
export const POST = post;
