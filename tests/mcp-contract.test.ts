import { test } from "node:test";
import assert from "node:assert/strict";
import { REST } from "discord.js";
import { McpServer } from "@modelcontextprotocol/server";
import { buildRestMcpServer } from "../src/mcp/build-rest-server.js";
import { createTeamContextSnapshot } from "../src/context/team-context-snapshot.js";
import { createTeamBriefContext, createDecisionLedgerContext, createTeamDeltaContext } from "../src/context/team-context-workflows.js";
import { createTeamStateCheckpoint, readTeamStateCheckpoint, diffTeamStates } from "../src/context/team-state-checkpoint.js";
import { setupEnv, mockDiscord, guildId, guildName, channelId, state, metadata } from "./fixtures.js";

test("MCP registers all nine original tools", () => {
 const restore=setupEnv();
 const names:string[]=[];
 const original=McpServer.prototype.registerTool;
 // Capture only registrations; no transport and no live Discord calls.
 (McpServer.prototype as any).registerTool=function(name:string) { names.push(name); return {remove(){},enable(){},disable(){},update(){}} };
 try {
   buildRestMcpServer({rest:new REST({version:"10"}),guildId,guildName});
   assert.deepEqual(names,["list_discord_channels","get_recent_discord_messages","get_team_context_snapshot","get_team_brief_context","get_decision_ledger_context","get_team_delta_context","create_team_state_checkpoint","compare_team_state_checkpoint","search_discord_messages"]);
 } finally { McpServer.prototype.registerTool=original; restore(); }
});
test("snapshot/brief/ledger/delta preserve response shapes and block unknown channels", async ()=>{
 const restore=setupEnv(), unmock=mockDiscord();
 try {
  const rest=new REST({version:"10"});
  const options={rest,guildId,guildName,channelIds:[channelId]};
  const snap=await createTeamContextSnapshot(options);
  assert.equal(snap.messageCount,1);
  assert.equal(snap.messages[0].serverId,guildId);
  assert.equal((await createTeamBriefContext(options)).mode,"team-brief");
  assert.equal((await createDecisionLedgerContext(options)).mode,"decision-ledger");
  assert.equal((await createTeamDeltaContext(options)).mode,"delta-brief");
  await assert.rejects(createTeamContextSnapshot({...options,channelIds:["unknown"]}),/not accessible/);
 } finally {unmock();restore();}
});
test("gycp1 checkpoint signatures, tamper protection, deterministic diff",()=>{
 const restore=setupEnv();
 try {
  const before=createTeamStateCheckpoint(state,metadata);
  assert.match(before.token,/^gycp1\./);
  assert.deepEqual(readTeamStateCheckpoint(before.token),before.checkpoint);
  assert.throws(()=>readTeamStateCheckpoint(before.token+"x"),/signature/);
  const after=createTeamStateCheckpoint({...state,decisions:[{id:"d1",status:"confirmed",summary:"Approved",evidenceIds:["m1"]}]},metadata);
  assert.equal(diffTeamStates(before.checkpoint,after.checkpoint).counts.added,1);
 } finally {restore();}
});
