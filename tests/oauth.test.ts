import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as register } from "../api/oauth/register.js";
import { GET as authorize, POST as approve } from "../api/oauth/authorize.js";
import { POST as token } from "../api/oauth/token.js";
import { GET as mcp } from "../api/mcp.js";
import { GET as resource } from "../api/oauth-protected-resource.js";
import { GET as discovery } from "../api/oauth-authorization-server.js";
import { canonicalMcpResource, sha256Base64Url, validOAuthAccessToken } from "../src/oauth/stateless.js";
import { setupEnv } from "./fixtures.js";
const origin="https://bridge.example.test", callback="https://chatgpt.com/connector_platform_oauth_redirect";
const form=(path:string,body:Record<string,string>)=>new Request(origin+path,{method:"POST",body:new URLSearchParams(body)});
test("OAuth v1 discovery, DCR, consent, PKCE code, refresh and MCP challenge",async()=>{
 const restore=setupEnv();
 try {
  assert.equal((await (await resource()).json()).resource,canonicalMcpResource());
  assert.equal((await (await discovery()).json()).token_endpoint,origin+"/oauth/token");
  assert.equal((await mcp(new Request(origin+"/mcp"))).status,401);
  const invalid=await register(new Request(origin+"/oauth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({redirect_uris:["https://evil.example/cb"]})}));
  assert.equal(invalid.status,400);
  const response=await register(new Request(origin+"/oauth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({redirect_uris:[callback]})}));
  assert.equal(response.status,201);
  const {client_id}=await response.json();
  const verifier="regression-pkce-0123456789012345678901234567";
  const params={response_type:"code",client_id,redirect_uri:callback,state:"state-1",code_challenge:await sha256Base64Url(verifier),code_challenge_method:"S256",resource:canonicalMcpResource(),scope:"discord:read"};
  assert.equal((await authorize(new Request(origin+"/oauth/authorize?"+new URLSearchParams(params)))).status,200);
  assert.equal((await approve(form("/oauth/authorize",{...params,team_code:"wrong"}))).status,403);
  const approved=await approve(form("/oauth/authorize",{...params,team_code:"test-team"}));
  assert.equal(approved.status,303);
  const code=new URL(approved.headers.get("location")!).searchParams.get("code")!;
  const issued=await token(form("/oauth/token",{grant_type:"authorization_code",code,client_id,redirect_uri:callback,code_verifier:verifier,resource:canonicalMcpResource()}));
  assert.equal(issued.status,200);
  const tokens=await issued.json();
  assert.equal(await validOAuthAccessToken(tokens.access_token),true);
  const refreshed=await token(form("/oauth/token",{grant_type:"refresh_token",refresh_token:tokens.refresh_token,client_id,resource:canonicalMcpResource()}));
  assert.equal(refreshed.status,200);
 } finally {restore();}
});
