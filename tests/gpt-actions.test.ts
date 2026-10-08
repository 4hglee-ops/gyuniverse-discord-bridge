import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as channels } from "../api/gpt/v1/channels.js";
import { GET as messages } from "../api/gpt/v1/messages.js";
import { GET as search } from "../api/gpt/v1/search.js";
import { GET as snapshot } from "../api/gpt/v1/context-snapshot.js";
import { GET as brief } from "../api/gpt/v1/team-brief-context.js";
import { GET as ledger } from "../api/gpt/v1/decision-ledger-context.js";
import { GET as delta } from "../api/gpt/v1/team-delta-context.js";
import { POST as checkpoint } from "../api/gpt/v1/state-checkpoint.js";
import { POST as diff } from "../api/gpt/v1/state-diff.js";
import { setupEnv, mockDiscord, channelId, state, metadata } from "./fixtures.js";
const origin="https://bridge.example.test";
const get=(url:string,token="test-actions")=>new Request(origin+url,{headers:{Authorization:"Bearer "+token}});
const post=(url:string,data:unknown)=>new Request(origin+url,{method:"POST",headers:{Authorization:"Bearer test-actions","Content-Type":"application/json"},body:JSON.stringify(data)});
test("GPT Actions authentication and all v1 REST endpoint contracts", async ()=>{
 const restore=setupEnv(), unmock=mockDiscord();
 try {
  assert.equal((await channels(new Request(origin+"/api/gpt/v1/channels"))).status,401);
  const listing=await channels(get("/api/gpt/v1/channels")); assert.equal(listing.status,200);
  assert.equal((await listing.json()).channels[0].id,channelId);
  const result=await messages(get("/api/gpt/v1/messages?channelId="+channelId));
  assert.equal(result.status,200); assert.equal((await result.json()).messages[0].content,"Decision logged");
  assert.equal((await messages(get("/api/gpt/v1/messages?channelId=unknown"))).status,404);
  const found=await search(get("/api/gpt/v1/search?query=Decision&channelId="+channelId));
  assert.equal(found.status,200); assert.equal((await found.json()).returnedResults,1);
  const qs="?channelIds="+channelId;
  assert.equal((await snapshot(get("/api/gpt/v1/context-snapshot"+qs))).status,200);
  assert.equal((await (await brief(get("/api/gpt/v1/team-brief-context"+qs))).json()).mode,"team-brief");
  assert.equal((await (await ledger(get("/api/gpt/v1/decision-ledger-context"+qs))).json()).mode,"decision-ledger");
  assert.equal((await (await delta(get("/api/gpt/v1/team-delta-context"+qs))).json()).mode,"delta-brief");
  const created=await checkpoint(post("/api/gpt/v1/state-checkpoint",{state,metadata}));
  assert.equal(created.status,200);
  const {token}=await created.json();
  const compared=await diff(post("/api/gpt/v1/state-diff",{previousCheckpointToken:token,currentState:state,currentMetadata:metadata}));
  assert.equal(compared.status,200);assert.equal((await compared.json()).diff.counts.total,0);
 } finally {unmock();restore();}
});
