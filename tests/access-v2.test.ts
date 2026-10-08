import { test } from "node:test";
import assert from "node:assert/strict";
import { REST, Routes, ChannelType } from "discord.js";
import { hashPersonalKey, principalFromPersonalKey, principalFromMcpRequest } from "../src/access/identity.js";
import { canReadChannel, selectGuild, legacyScope, visibleChannels, resolveReadableChannel, scopeForPrincipal } from "../src/access/scope.js";
import { configuredAccessStore, type AccessStore } from "../src/access/store.js";
import { AccessDeniedError, ScopeSelectionError, type GuildGrant, type Principal } from "../src/access/types.js";

const key = "gdb_" + "x".repeat(40);
const grant: GuildGrant = {
  id: "guild-a", name: "Team A", mode: "selected_channels",
  allowedChannelIds: new Set(["channel-1"]),
};
const principal: Principal = { kind: "personal", userId: "user-1", role: "member", credentialId: "key-1" };

function fakeStore(): AccessStore {
  return {
    async credentialByHash(hash) {
      return hash === hashPersonalKey(key)
        ? { id: "key-1", user_id: "user-1", revoked_at: null } : null;
    },
    async userById(id) {
      return id === "user-1" ? {id, role: "member", enabled: true} : null;
    },
    async grantsForUser(id) {
      return id === "user-1" ? [grant] : [];
    },
  };
}

test("personal keys identify a user, unknown keys fail closed", async () => {
  const store = fakeStore();
  assert.deepEqual(await principalFromPersonalKey(key, store), principal);
  assert.equal(await principalFromPersonalKey("gdb_"+"z".repeat(40), store), null);
  assert.equal(await principalFromPersonalKey("malformed", store), null);
});

test("v1 shared bearer is a legacy principal only", async () => {
  const before = process.env.MCP_SHARED_SECRET;
  process.env.MCP_SHARED_SECRET = "legacy-secret";
  try {
    const request = new Request("https://example.test/mcp", {
      headers: {Authorization:"Bearer legacy-secret"},
    });
    const legacy = await principalFromMcpRequest(request, fakeStore());
    assert.equal(legacy?.kind, "legacy");
    assert.equal(legacy?.userId, "gyuniverse-team");
    assert.equal(await principalFromMcpRequest(new Request("https://example.test/mcp"),fakeStore()),null);
  } finally {
    if(before === undefined) delete process.env.MCP_SHARED_SECRET;
    else process.env.MCP_SHARED_SECRET=before;
  }
});

test("scope restricts guild and channel; omitted guild is ambiguous", async () => {
  const scope = await scopeForPrincipal(principal, fakeStore(), "legacy", "Old team");
  assert.equal(scope.guilds.length,1);
  assert.equal(canReadChannel(selectGuild(scope,"guild-a"),"channel-1"),true);
  assert.equal(canReadChannel(selectGuild(scope,"guild-a"),"private"),false);
  assert.throws(()=>selectGuild(scope,"guild-b"),AccessDeniedError);
  assert.throws(()=>selectGuild({principal,guilds:[grant,{...grant,id:"guild-b"}]}),ScopeSelectionError);
  assert.deepEqual(legacyScope("old", "Old team").guilds.map(x=>x.id),["old"]);
});

test("direct channel IDs cannot bypass selected-channel ACL", async () => {
  const original = REST.prototype.get;
  REST.prototype.get = (async (route: string) => {
    assert.equal(route,Routes.guildChannels("guild-a"));
    return [
      {id:"channel-1",name:"public",type:ChannelType.GuildText},
      {id:"private",name:"secret",type:ChannelType.GuildText},
    ];
  }) as typeof REST.prototype.get;
  try {
    const rest = new REST({version:"10"});
    const scope = {principal,guilds:[grant]};
    assert.deepEqual((await visibleChannels(rest,grant)).map(c=>c.id),["channel-1"]);
    assert.equal((await resolveReadableChannel(rest,scope,"channel-1")).channel.id,"channel-1");
    await assert.rejects(resolveReadableChannel(rest,scope,"private"),AccessDeniedError);
    await assert.rejects(resolveReadableChannel(rest,scope,"channel-1","guild-b"),AccessDeniedError);
  } finally { REST.prototype.get=original; }
});

test("partial DB configuration is rejected instead of silently falling back", () => {
  const beforeUrl=process.env.BRIDGE_SUPABASE_URL, beforeKey=process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.BRIDGE_SUPABASE_URL="https://example.supabase.co";
    delete process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(()=>configuredAccessStore(),/partially configured/);
  } finally {
    if(beforeUrl===undefined) delete process.env.BRIDGE_SUPABASE_URL; else process.env.BRIDGE_SUPABASE_URL=beforeUrl;
    if(beforeKey===undefined) delete process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY; else process.env.BRIDGE_SUPABASE_SERVICE_ROLE_KEY=beforeKey;
  }
});
