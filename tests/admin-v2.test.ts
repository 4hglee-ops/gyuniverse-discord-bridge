import { test } from "node:test";
import assert from "node:assert/strict";
import { REST, Routes, ChannelType } from "discord.js";
import { executeAdminAction, isAdminAuthorized, type AdminStore } from "../src/admin/service.js";
import { hashPersonalKey, isPersonalKey } from "../src/access/identity.js";

test("admin key rejects unauthenticated and previous shared-key calls",()=>{
  const previous=process.env.BRIDGE_ADMIN_API_KEY;
  process.env.BRIDGE_ADMIN_API_KEY="a".repeat(40);
  try {
    assert.equal(isAdminAuthorized(new Request("https://example.test")),false);
    assert.equal(isAdminAuthorized(new Request("https://example.test",{headers:{Authorization:"Bearer legacy"}})),false);
    assert.equal(isAdminAuthorized(new Request("https://example.test",{headers:{Authorization:"Bearer "+"a".repeat(40)}})),true);
  } finally {if(previous===undefined) delete process.env.BRIDGE_ADMIN_API_KEY;else process.env.BRIDGE_ADMIN_API_KEY=previous;}
});

test("admin guild registration uses bot-verified Discord metadata",async()=>{
  const old=REST.prototype.get;
  const records:Array<{name:string;params:Record<string,unknown>}>=[];
  const store:AdminStore={async rpc<T>(name:string,params:Record<string,unknown>){
    records.push({name,params}); return {ok:true} as T;
  }};
  const guildId="123456789012345678";
  REST.prototype.get=(async(route:string)=>{
    if(route===Routes.guild(guildId)) return {id:guildId,name:"Verified Guild"};
    if(route===Routes.guildChannels(guildId)) return [
      {id:"234567890123456789",name:"general",type:ChannelType.GuildText},
      {id:"345678901234567890",name:"voice",type:ChannelType.GuildVoice},
    ];
    throw Error("Unexpected route "+route);
  }) as typeof REST.prototype.get;
  try{
    const rest=new REST({version:"10"});
    await executeAdminAction({action:"registerGuild",guildId},rest,store);
    assert.equal(records[0].name,"bridge_sync_guild");
    assert.equal(records[0].params.p_guild_name,"Verified Guild");
    assert.deepEqual(records[0].params.p_channels,[{id:"234567890123456789",name:"general"}]);
    assert.equal(records[0].params.p_create,true);
    await executeAdminAction({action:"syncGuild",guildId},rest,store);
    assert.equal(records[1].params.p_create,false);
  }finally{REST.prototype.get=old;}
});

test("admin writes validate scope and issue only hashed credentials",async()=>{
 const events:Array<{name:string;params:Record<string,unknown>}>=[];
 const store:AdminStore={async rpc<T>(name:string,params:Record<string,unknown>){
   events.push({name,params});return {ok:true} as T;
 }};
 const rest=new REST({version:"10"});
 const uid="550e8400-e29b-41d4-a716-446655440000";
 const gid="123456789012345678";
 await assert.rejects(executeAdminAction({action:"setAccess",userId:uid,guildId:gid,mode:"all_channels",channelIds:["234567890123456789"]},rest,store),/Invalid access grant/);
 await assert.rejects(executeAdminAction({action:"setAccess",userId:uid,guildId:gid,mode:"selected_channels",channelIds:["invalid"]},rest,store),/Invalid access grant/);
 await executeAdminAction({action:"setAccess",userId:uid,guildId:gid,mode:"selected_channels",channelIds:[]},rest,store);
 assert.equal(events.at(-1)?.name,"bridge_set_access");
 const issued=await executeAdminAction({action:"issueCredential",userId:uid},rest,store) as {secret:string};
 assert.equal(isPersonalKey(issued.secret),true);
 assert.equal(events.at(-1)?.params.p_token_hash,hashPersonalKey(issued.secret));
 assert.equal(JSON.stringify(events).includes(issued.secret),false);
});
