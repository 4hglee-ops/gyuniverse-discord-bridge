import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as ui } from "../api/admin/v1/ui.js";
import { GET as sessionGet, POST as login, DELETE as logout } from "../api/admin/v1/session.js";
import { GET as overview } from "../api/admin/v1/overview.js";
import { createAdminSession, currentAdminSession, adminRequestMode } from "../src/admin/session.js";

const origin = "https://bridge.example.test";
const req=(url:string,init:RequestInit={})=>new Request(origin+url,init);
test("admin UI has isolated CSP and no admin credential",async()=>{
 const page=ui();assert.equal(page.status,200);
 const body=await page.text();
 const csp=page.headers.get("Content-Security-Policy")??"";
 assert.match(body,/Gyuniverse Bridge/);
 assert.match(body,/사용자 및 읽기 권한/);
 assert.match(csp,/script-src 'nonce-/);
 assert.equal(body.includes("BRIDGE_ADMIN_API_KEY="),false);
});
test("admin UI uses signed HttpOnly session and same-origin CSRF",async()=>{
 const previous={
   password:process.env.BRIDGE_ADMIN_UI_PASSWORD,
   secret:process.env.BRIDGE_ADMIN_SESSION_SECRET,
   api:process.env.BRIDGE_ADMIN_API_KEY,
 };
 process.env.BRIDGE_ADMIN_UI_PASSWORD="p".repeat(40);
 process.env.BRIDGE_ADMIN_SESSION_SECRET="s".repeat(40);
 process.env.BRIDGE_ADMIN_API_KEY="a".repeat(40);
 try {
  const initial=await sessionGet(req("/api/admin/v1/session"));
  assert.equal((await initial.json()).authenticated,false);
  const unauthorized=await login(req("/api/admin/v1/session",{method:"POST",headers:{"Content-Type":"application/json","Origin":"https://other.test"},body:JSON.stringify({password:"p".repeat(40)})}));
  assert.equal(unauthorized.status,403);
  const result=await login(req("/api/admin/v1/session",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify({password:"p".repeat(40)})}));
  assert.equal(result.status,200);
  const cookie=result.headers.get("set-cookie")??"";
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
  const csrf=(await result.json()).csrf as string;
  const request=req("/api/admin/v1/overview",{headers:{Cookie:cookie.split(";")[0]}});
  assert.ok(currentAdminSession(request));
  assert.equal(adminRequestMode(request), "session");
  assert.equal(adminRequestMode(request,true),null);
  assert.equal(adminRequestMode(req("/api/admin/v1/actions",{method:"POST",headers:{Cookie:cookie.split(";")[0],Origin:origin,"X-Bridge-CSRF":csrf}}),true),"session");
  assert.equal((await overview(req("/api/admin/v1/overview"))).status,401);
  const loggedOut=await logout(req("/api/admin/v1/session",{method:"DELETE",headers:{Cookie:cookie.split(";")[0],Origin:origin,"X-Bridge-CSRF":csrf}}));
  assert.equal(loggedOut.status,200);assert.match(loggedOut.headers.get("set-cookie")??"",/Max-Age=0/);
 }finally{
   if(previous.password===undefined)delete process.env.BRIDGE_ADMIN_UI_PASSWORD;else process.env.BRIDGE_ADMIN_UI_PASSWORD=previous.password;
   if(previous.secret===undefined)delete process.env.BRIDGE_ADMIN_SESSION_SECRET;else process.env.BRIDGE_ADMIN_SESSION_SECRET=previous.secret;
   if(previous.api===undefined)delete process.env.BRIDGE_ADMIN_API_KEY;else process.env.BRIDGE_ADMIN_API_KEY=previous.api;
 }
});
