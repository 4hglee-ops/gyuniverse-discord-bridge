import { test } from "node:test";
import assert from "node:assert/strict";
import { ChannelType, REST, Routes } from "discord.js";
import { ScopedDiscordReader } from "../src/access/discord-reader.js";
import type { AccessScope } from "../src/access/types.js";

const scope: AccessScope = {
  principal: { kind:"personal",userId:"user",role:"viewer" },
  guilds: [{
    id:"g1",name:"Guild",mode:"selected_channels",
    allowedChannelIds:new Set(["allowed"]),
  }],
};
function fakeThread(id:string,parent_id:string,type:number,archived=false) {
  return { id,parent_id,guild_id:"g1",type,name:id,thread_metadata:{archived} };
}
const msg=(id:string)=>({
  id,channel_id:"t1",content:"thread message",timestamp:"2026-10-26T00:00:00Z",
  author:{id:"u",username:"Tester"},attachments:[],
});

test("thread listing respects parent ACL and bot membership",async()=>{
  const old=REST.prototype.get, calls:string[]=[];
  REST.prototype.get=(async(route:string)=>{
    calls.push(route);
    if(route===Routes.guildChannels("g1"))return [
      {id:"allowed",name:"allowed",type:ChannelType.GuildText},
      {id:"denied",name:"denied",type:ChannelType.GuildText},
    ];
    if(route===Routes.guildActiveThreads("g1"))return {
      threads:[fakeThread("t1","allowed",ChannelType.PublicThread),
        fakeThread("secret","allowed",ChannelType.PrivateThread),
        fakeThread("elsewhere","denied",ChannelType.PublicThread)],
      members:[],
    };
    if(route===Routes.channelThreads("allowed","public"))return {threads:[fakeThread("arch","allowed",ChannelType.PublicThread,true)],has_more:false};
    if(route===Routes.channelJoinedArchivedThreads("allowed"))return {threads:[],has_more:false};
    throw new Error("unexpected: "+route);
  }) as typeof REST.prototype.get;
  try {
    const reader=new ScopedDiscordReader(new REST({version:"10"}),scope);
    await assert.rejects(reader.listThreads("denied"),/not accessible/);
    assert.ok(!calls.includes(Routes.guildActiveThreads("g1")));
    const result=await reader.listThreads("allowed");
    assert.deepEqual(result.threads.map(t=>t.id),["t1","arch"]);
  }finally{REST.prototype.get=old;}
});

test("thread messages enforce parent, guild, and private-thread membership",async()=>{
  const old=REST.prototype.get, calls:string[]=[];
  REST.prototype.get=(async(route:string)=>{
    calls.push(route);
    if(route===Routes.guildChannels("g1"))return [{id:"allowed",name:"allowed",type:ChannelType.GuildText}];
    if(route===Routes.channel("t1"))return fakeThread("t1","allowed",ChannelType.PublicThread);
    if(route===Routes.channel("private"))return fakeThread("private","allowed",ChannelType.PrivateThread);
    if(route===Routes.threadMembers("private","@me"))throw Object.assign(new Error("missing"),{status:404});
    if(route===Routes.channelMessages("t1"))return [msg("m2"),msg("m1")];
    if(route===Routes.channelMessage("allowed","t1"))return {...msg("t1"),channel_id:"allowed",content:"parent starter"};
    throw new Error("unexpected "+route);
  }) as typeof REST.prototype.get;
  try {
    const reader=new ScopedDiscordReader(new REST({version:"10"}),scope);
    await assert.rejects(reader.threadMessages("t1","denied"),/not accessible/);
    assert.ok(!calls.includes(Routes.channel("t1")));
    const page=await reader.threadMessages("t1","allowed",{limit:2});
    assert.deepEqual(page.messages.map(m=>m.id),["m1","m2"]);
    assert.equal(page.starterMessage?.content,"parent starter");
    assert.equal(page.nextBefore,"m1");
    await assert.rejects(reader.threadMessages("private","allowed"),/not accessible/);
    assert.ok(!calls.includes(Routes.channelMessages("private")));
  }finally{REST.prototype.get=old;}
});
