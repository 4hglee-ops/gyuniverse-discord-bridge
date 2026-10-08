import { ChannelType, Routes, REST } from "discord.js";
export const guildId = "g1", guildName = "Test Guild", channelId = "c1";
export const message = { id:"m1", channel_id:channelId, content:"Decision logged", timestamp:"2026-09-03T12:00:00Z", author:{id:"u1", username:"alice"}, attachments:[] };
export function mockResponse(route: string): unknown {
 if(route === Routes.guildChannels(guildId)) return [{id:channelId,name:"general",type:ChannelType.GuildText},{id:"v1",name:"voice",type:ChannelType.GuildVoice}];
 if(route === Routes.channelMessages(channelId)) return [message];
 if(route === Routes.guildMessagesSearch(guildId)) return {total_results:1,messages:[[message]]};
 throw new Error("Unexpected REST route: "+route);
}
export function mockDiscord(): ()=>void {
 const original = REST.prototype.get;
 REST.prototype.get = (async (route: string) => mockResponse(route)) as typeof REST.prototype.get;
 return ()=>{REST.prototype.get=original};
}
export function setupEnv(): ()=>void {
 const vars = {DISCORD_BOT_TOKEN:"fake-token",DISCORD_GUILD_ID:guildId,DISCORD_GUILD_NAME:guildName,MCP_SHARED_SECRET:"test-shared-secret",MCP_OAUTH_TEAM_CODE:"test-team",MCP_OAUTH_SIGNING_SECRET:"test-signing-secret",GPT_ACTIONS_API_KEY:"test-actions",PUBLIC_BASE_URL:"https://bridge.example.test"};
 const prev = Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));
 Object.assign(process.env,vars);
 return ()=>{ for(const [k,v] of Object.entries(prev)) { if(v === undefined) delete process.env[k]; else process.env[k]=v; } };
}
export const state = {decisions:[],work:[],blockers:[],questions:[],proposals:[]};
export const metadata = {snapshotAt:"2026-09-03T13:00:00Z",baselineVersion:"example-1.0.0",historyComplete:false,newestMessageAt:null};
