import { test } from "node:test";
import assert from "node:assert/strict";
import { REST, Routes, ChannelType } from "discord.js";
import { ScopedDiscordReader } from "../src/access/discord-reader.js";
import type { AccessScope } from "../src/access/types.js";

test("scoped reader blocks hidden channel and never performs an unauthorized message read", async () => {
  const old = REST.prototype.get;
  const calls: string[] = [];
  REST.prototype.get = (async (route: string) => {
    calls.push(route);
    if (route === Routes.guildChannels("g1")) return [
      {id:"visible",name:"visible",type:ChannelType.GuildText},
      {id:"hidden",name:"hidden",type:ChannelType.GuildText},
    ];
    throw Error("Unexpected Discord call: "+route);
  }) as typeof REST.prototype.get;
  const scope: AccessScope = {
    principal:{kind:"personal",userId:"u1",role:"viewer"},
    guilds:[{id:"g1",name:"G1",mode:"selected_channels",allowedChannelIds:new Set(["visible"])}],
  };
  try {
    const reader = new ScopedDiscordReader(new REST({version:"10"}),scope);
    assert.deepEqual((await reader.listChannels()).map(c=>c.id),["visible"]);
    await assert.rejects(reader.recentMessages("hidden"),/not accessible/);
    await assert.rejects(reader.snapshot({channelIds:["hidden"]}),/not accessible/);
    assert.ok(calls.every(route=>route===Routes.guildChannels("g1")));
  } finally { REST.prototype.get=old; }
});

test("two accessible guilds require explicit server selection for snapshots",async()=>{
  const scope:AccessScope={
    principal:{kind:"personal",userId:"u1",role:"viewer"},
    guilds:[
      {id:"a",name:"A",mode:"selected_channels",allowedChannelIds:new Set()},
      {id:"b",name:"B",mode:"selected_channels",allowedChannelIds:new Set()},
    ],
  };
  const reader=new ScopedDiscordReader(new REST({version:"10"}),scope);
  assert.deepEqual(reader.listServers().map(g=>g.id),["a","b"]);
  await assert.rejects(reader.snapshot({}),/serverId is required/);
});
