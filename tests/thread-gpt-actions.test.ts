import { test } from "node:test";
import assert from "node:assert/strict";
import { ChannelType, REST, Routes } from "discord.js";
import { GET as listThreads } from "../api/gpt/v1/threads.js";
import { GET as threadMessages } from "../api/gpt/v1/thread-messages.js";
import { GET as openapi } from "../api/gpt/openapi.js";
import { setupEnv } from "./fixtures.js";

const origin="https://bridge.example.test";
const auth=(path:string,authorized=true)=>new Request(origin+path,{
  headers:authorized?{Authorization:"Bearer test-actions"}:{},
});

test("GPT Actions exposes the two thread endpoints in OpenAPI",()=>{
 const doc=(openapi(new Request(origin+"/api/gpt/openapi")) as Response);
 assert.equal(doc.status,200);
 return doc.json().then((body:any)=>{
  assert.ok(body.paths["/api/gpt/v1/threads"]);
  assert.ok(body.paths["/api/gpt/v1/thread-messages"]);
  assert.ok(body.paths["/api/gpt/v1/search"].get.parameters.some((p:any)=>p.name==="includeThreads"));
 });
});

test("GPT Actions thread endpoints authenticate, enforce parent scope and return pagination",async()=>{
 const restoreEnv=setupEnv();
 const old=REST.prototype.get;
 REST.prototype.get=(async(route:string)=>{
  if(route===Routes.guildChannels("g1"))return [{id:"c1",name:"general",type:ChannelType.GuildText}];
  if(route===Routes.guildActiveThreads("g1"))return {threads:[{id:"t1",name:"thread",type:ChannelType.PublicThread,parent_id:"c1",guild_id:"g1"}],members:[]};
  if(route===Routes.channelThreads("c1","public"))return {threads:[],has_more:false};
  if(route===Routes.channelJoinedArchivedThreads("c1"))return {threads:[],has_more:false};
  if(route===Routes.channel("t1"))return {id:"t1",name:"thread",type:ChannelType.PublicThread,parent_id:"c1",guild_id:"g1"};
  if(route===Routes.channelMessages("t1"))return [{id:"111111111111111111",channel_id:"t1",content:"reply",timestamp:"2026-10-26T08:00:00Z",author:{id:"u1",username:"user"},attachments:[]}];
  if(route===Routes.channelMessage("c1","t1"))throw Object.assign(new Error("not found"),{status:404});
  throw Error("unexpected Discord route "+route);
 }) as typeof REST.prototype.get;
 try {
  assert.equal((await listThreads(auth("/api/gpt/v1/threads",false))).status,401);
  assert.equal((await listThreads(auth("/api/gpt/v1/threads"))).status,400);
  assert.equal((await listThreads(auth("/api/gpt/v1/threads?channelId=hidden"))).status,404);
  const list=await listThreads(auth("/api/gpt/v1/threads?channelId=c1"));
  assert.equal(list.status,200);
  assert.deepEqual((await list.json()).threads.map((t:any)=>t.id),["t1"]);
  assert.equal((await threadMessages(auth("/api/gpt/v1/thread-messages?parentChannelId=hidden&threadId=t1"))).status,404);
  const page=await threadMessages(auth("/api/gpt/v1/thread-messages?parentChannelId=c1&threadId=t1"));
  assert.equal(page.status,200);
  const response=await page.json();
  assert.equal(response.messages[0].content,"reply");
  assert.equal(response.starterMessage,null);
  assert.equal((await threadMessages(auth("/api/gpt/v1/thread-messages?parentChannelId=c1&threadId=t1&before=bad"))).status,400);
 }finally{REST.prototype.get=old;restoreEnv();}
});
