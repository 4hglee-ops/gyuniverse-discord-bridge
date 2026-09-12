import "dotenv/config";

import { createDiscordRestClient } from "./discord/rest-client.js";
import { listTextChannelsRest } from "./discord/rest-channels.js";
import { getRecentMessagesRest } from "./discord/rest-messages.js";
import { toBridgeMessageRest } from "./adapters/discord-rest-message-adapter.js";

async function main(): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const guildName = process.env.DISCORD_GUILD_NAME;
  const targetChannelId = process.env.DISCORD_TEST_CHANNEL_ID;

  if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured.");
  if (!guildId) throw new Error("DISCORD_GUILD_ID is not configured.");
  if (!guildName) throw new Error("DISCORD_GUILD_NAME is not configured.");
  if (!targetChannelId) throw new Error("DISCORD_TEST_CHANNEL_ID is not configured.");

  const rest = createDiscordRestClient(token);
  const channels = await listTextChannelsRest(rest, guildId);
  const channel = channels.find((item) => item.id === targetChannelId);

  if (!channel) throw new Error(`Target channel is not accessible: ${targetChannelId}`);

  const discordMessages = await getRecentMessagesRest(rest, channel.id, 20);
  const bridgeMessages = discordMessages.map((message) =>
    toBridgeMessageRest(message, {
      guildId,
      guildName,
      channelId: channel.id,
      channelName: channel.name,
    }),
  );

  console.log(`REST BridgeMessage count: ${bridgeMessages.length}\n`);
  for (const message of bridgeMessages) {
    console.log({
      id: message.id,
      source: message.source,
      server: message.serverName,
      channel: message.channelName,
      author: message.authorName,
      content: message.content,
      timestamp: message.timestamp,
      attachments: message.attachments.length,
    });
    console.log("---");
  }
}

main().catch((error) => {
  console.error("Discord REST adapter integration test failed:", error);
  process.exit(1);
});
