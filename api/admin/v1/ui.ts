import { randomBytes } from "node:crypto";

export function GET():Response {
 const nonce=randomBytes(16).toString("base64");
 const html=String.raw`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gyuniverse Bridge · Admin</title>
<style>
:root{color-scheme:dark;--bg:#0b1120;--surface:#131d30;--line:#2b3a50;--muted:#a1b1c7;--accent:#7c9fff}
*{box-sizing:border-box}body{background:var(--bg);color:#e7efff;font:14px system-ui,sans-serif;margin:0}
header{padding:18px 26px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center}
h1{font-size:19px;margin:0}h2{font-size:16px;margin:0 0 14px}h3{font-size:14px;margin:14px 0}
main{max-width:1240px;margin:auto;padding:22px}.layout{display:grid;grid-template-columns:220px 1fr;gap:18px}
nav,.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px}
nav button{width:100%;text-align:left;margin-bottom:8px}button,input,select{font:inherit;border-radius:7px;border:1px solid var(--line);background:#202c40;color:inherit;padding:9px 11px}
button{cursor:pointer}button:hover{border-color:var(--accent)}button.primary{background:#4968bb;border-color:#7089cf}
input,select{max-width:100%}label{display:block;color:var(--muted);margin:8px 0 5px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
fieldset{border:1px solid var(--line);border-radius:8px;padding:10px;margin:14px 0}
legend{color:var(--muted)}.channel{display:flex;align-items:center;gap:10px;border-bottom:1px solid #27344a;padding:7px 0}
.channel input{margin:0}small,.muted{color:var(--muted)}.status{padding:10px 0;min-height:36px}
table{border-collapse:collapse;width:100%}td,th{padding:10px 6px;text-align:left;border-bottom:1px solid var(--line)}
.hidden{display:none!important}#login{max-width:440px;margin:70px auto}#secret{overflow-wrap:anywhere;background:#1f3045;padding:10px;border-radius:8px}
@media(max-width:750px){.layout,.grid{grid-template-columns:1fr}main{padding:12px}header{padding:15px}}
</style></head><body>
<header><h1>Gyuniverse Bridge <small>관리 콘솔 v2</small></h1><button id="logout" class="hidden">로그아웃</button></header>
<main>
<section id="login" class="panel hidden"><h2>관리자 로그인</h2><p class="muted">별도의 UI 관리자 비밀번호를 사용합니다. 기존 팀 MCP 접근 코드는 사용할 수 없습니다.</p>
<form id="login-form"><label for="password">관리자 비밀번호</label><input id="password" type="password" autocomplete="current-password" required minlength="32"><button class="primary" type="submit">로그인</button></form></section>
<div id="app" class="layout hidden"><nav><h2>관리</h2>
<button data-tab="servers">Discord 서버</button><button data-tab="users">사용자 / 권한</button>
<button data-tab="credentials">연결 키</button><button data-tab="audit">변경 이력</button>
</nav><div>
<section id="servers" class="panel"><h2>Discord 서버</h2><p class="muted">Bot이 설치된 서버의 숫자 ID를 입력하세요. 등록 후 채널 목록을 동기화합니다.</p>
<form id="guild-form" class="row"><input id="guild-id" placeholder="Discord 서버 ID" pattern="[0-9]{16,22}" required><button type="submit" class="primary">서버 등록</button></form>
<div id="server-list"></div></section>
<section id="users" class="panel hidden"><h2>사용자 및 읽기 권한</h2>
<form id="user-form" class="row"><input id="user-name" maxlength="80" placeholder="새 사용자 표시 이름" required>
<select id="new-role"><option>viewer</option><option>member</option><option>admin</option></select>
<button type="submit">사용자 추가</button></form>
<div class="grid"><div><h3>권한 대상</h3><label for="user-id">사용자</label><select id="user-id"></select>
<label for="access-guild">Discord 서버</label><select id="access-guild"></select>
<label for="access-mode">읽기 모드</label><select id="access-mode"><option value="selected_channels">선택 채널만 허용</option><option value="all_channels">모든 채널 (신규 채널 포함)</option></select>
<p class="muted">선택 채널 모드에서는 새 채널을 기본 차단합니다.</p></div>
<div><h3>허용할 채널</h3><div id="channel-list"></div>
<button id="save-access" class="primary" type="button">권한 저장</button></div></div></section>
<section id="credentials" class="panel hidden"><h2>개인 AI 연결 키</h2>
<p class="muted">키는 발급할 때 한 번만 표시됩니다. 안전한 장소에 저장한 뒤 화면을 닫으세요.</p>
<div class="row"><select id="credential-user"></select><button id="issue-key">키 발급</button></div>
<p id="secret" class="hidden" aria-live="polite"></p>
<h3>발급 기록</h3><div id="credential-list"></div></section>
<section id="audit" class="panel hidden"><h2>변경 이력</h2><div id="audit-list"></div></section>
<div id="status" class="status" role="status" aria-live="polite"></div>
</div></div></main>
<script nonce="\${nonce}">
"use strict";
const base="/api/admin/v1/";
const $=id=>document.getElementById(id);
let csrf="",overview=null;
function el(name,text){const n=document.createElement(name);n.textContent=String(text??"");return n;}
function status(text,error=false){$("status").textContent=text;$("status").style.color=error?"#ff9898":"#b4d0ff";}
async function call(path,options={}){
 const response=await fetch(base+path,{credentials:"same-origin",cache:"no-store",...options});
 const result=await response.json();
 if(!response.ok)throw Error(result.error||"요청 실패 ("+response.status+")");
 return result;
}
async function action(body){
 const result=await call("actions",{method:"POST",headers:{"Content-Type":"application/json","X-Bridge-CSRF":csrf},body:JSON.stringify(body)});
 await refresh();return result;
}
function fillSelect(id,rows,caption){const node=$(id),old=node.value;node.replaceChildren();for(const row of rows){const option=el("option",caption(row));option.value=row.id;node.append(option);}if(rows.some(x=>x.id===old))node.value=old;}
function render(){
 const d=overview;
 fillSelect("user-id",d.users.filter(x=>x.enabled),x=>x.display_name+" · "+x.role);
 fillSelect("credential-user",d.users.filter(x=>x.enabled),x=>x.display_name);
 fillSelect("access-guild",d.guilds.filter(x=>x.enabled),x=>x.name);
 $("server-list").replaceChildren();
 const table=el("table"),thead=el("tr");
 for(const col of ["서버","동기화","상태","작업"])thead.append(el("th",col));
 table.append(thead);
 for(const g of d.guilds){const tr=el("tr");
 tr.append(el("td",g.name+" ("+g.id+")"),el("td",g.synced_at||"미동기화"),el("td",g.enabled?"활성":"비활성"));
 const td=el("td"),button=el("button","동기화");button.onclick=()=>run(async()=>{await action({action:"syncGuild",guildId:g.id});status("서버 채널 동기화 완료");});td.append(button);tr.append(td);table.append(tr);}
 $("server-list").append(table);
 const credentials=el("table"),head=el("tr");
 for(const c of ["사용자","상태","발급일","작업"])head.append(el("th",c));credentials.append(head);
 for(const c of d.credentials){const row=el("tr");const user=d.users.find(u=>u.id===c.user_id);
 row.append(el("td",user?.display_name||c.user_id),el("td",c.revoked_at?"폐기":"활성"),el("td",c.created_at));
 const td=el("td");if(!c.revoked_at){const b=el("button","폐기");b.onclick=()=>run(async()=>{if(!confirm("이 키를 폐기할까요?"))return;await action({action:"revokeCredential",credentialId:c.id});status("키 폐기 완료");});td.append(b);}
 row.append(td);credentials.append(row);} $("credential-list").replaceChildren(credentials);
 const log=el("table"),tr=el("tr");for(const t of ["시각","작업","대상"])tr.append(el("th",t));log.append(tr);
 for(const a of d.audit){const row=el("tr");row.append(el("td",a.created_at),el("td",a.action),el("td",a.target_type+" · "+a.target_id));log.append(row);} $("audit-list").replaceChildren(log);
 renderChannels();
}
function renderChannels(){
 if(!overview)return;
 const uid=$("user-id").value,gid=$("access-guild").value;
 const grant=overview.grants.find(g=>g.user_id===uid&&g.guild_id===gid);
 $("access-mode").value=grant?.access_mode||"selected_channels";
 const list=$("channel-list");list.replaceChildren();
 const allowed=new Set(overview.allowedChannels.filter(g=>g.user_id===uid&&g.guild_id===gid).map(g=>g.channel_id));
 for(const channel of overview.channels.filter(c=>c.guild_id===gid)){
 const label=el("label");label.className="channel";const cb=document.createElement("input");cb.type="checkbox";cb.value=channel.id;cb.checked=allowed.has(channel.id);cb.disabled=!channel.active;label.append(cb,el("span","#"+channel.name+(channel.active?"":" (비활성)")));list.append(label);}
 $("channel-list").classList.toggle("hidden",$("access-mode").value==="all_channels");
}
async function refresh(){overview=await call("overview");render();}
async function run(callback){try{await callback();}catch(e){status(e.message,true);}}
async function initialize(){
 const session=await call("session");
 csrf=session.csrf||"";
 $("login").classList.toggle("hidden",session.authenticated);
 $("app").classList.toggle("hidden",!session.authenticated);
 $("logout").classList.toggle("hidden",!session.authenticated);
 if(session.authenticated)await refresh();
}
$("login-form").onsubmit=e=>{e.preventDefault();run(async()=>{
 const result=await call("session",{method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({password:$("password").value})});
 csrf=result.csrf;$("password").value="";await initialize();status("로그인 완료");
});};
$("logout").onclick=()=>run(async()=>{await call("session",{method:"DELETE",headers:{"X-Bridge-CSRF":csrf}});csrf="";overview=null;$("secret").textContent="";$("secret").classList.add("hidden");await initialize();});
document.querySelectorAll("[data-tab]").forEach(button=>button.onclick=()=>{
 for(const id of ["servers","users","credentials","audit"])$(id).classList.toggle("hidden",id!==button.dataset.tab);
});
$("guild-form").onsubmit=e=>{e.preventDefault();run(async()=>{
 await action({action:"registerGuild",guildId:$("guild-id").value.trim()});
 $("guild-id").value="";status("서버 등록 완료");
});};
$("user-form").onsubmit=e=>{e.preventDefault();run(async()=>{
 await action({action:"createUser",displayName:$("user-name").value.trim(),role:$("new-role").value});
 $("user-name").value="";status("사용자 생성 완료");
});};
$("user-id").onchange=renderChannels;$("access-guild").onchange=renderChannels;
$("access-mode").onchange=()=>{ $("channel-list").classList.toggle("hidden",$("access-mode").value==="all_channels"); };
$("save-access").onclick=()=>run(async()=>{
 const mode=$("access-mode").value,channelIds=mode==="all_channels"?[]:
 Array.from($("channel-list").querySelectorAll("input:checked:not(:disabled)")).map(x=>x.value);
 await action({action:"setAccess",userId:$("user-id").value,guildId:$("access-guild").value,mode,channelIds});
 status("권한 설정 저장 완료");
});
$("issue-key").onclick=()=>run(async()=>{
 const result=await action({action:"issueCredential",userId:$("credential-user").value});
 $("secret").textContent=result.secret;$("secret").classList.remove("hidden");
 status("발급한 키는 한 번만 표시됩니다.");
});
run(initialize);
</script></body></html>`.replaceAll("${nonce}",nonce);
 return new Response(html,{headers:{
   "Content-Type":"text/html; charset=utf-8",
   "Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff",
   "Referrer-Policy":"no-referrer",
   "X-Frame-Options":"DENY",
   "Content-Security-Policy":"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'",
 }});
}
