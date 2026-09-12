import "dotenv/config";
import { Events } from "discord.js";
import { createDiscordClient } from "./discord/client.js";
import { getRecentMessages } from "./discord/messages.js";
import { toBridgeMessage } from "./adapters/discord-message-adapter.js";

const token = process.env.DISCORD_BOT_TOKEN;
const targetChannelId = process.env.DISCORD_TEST_CHANNEL_ID;

if (!token) throw new Error("DISCORD_BOT_TOKEN is not configured.");
if (!targetChannelId) throw new Error("DISCORD_TEST_CHANNEL_ID is not configured.");

const client = createDiscordClient();

client.once(Events.ClientReady, async (readyClient) => {
  try {
    console.log(`Discord login succeeded: ${readyClient.user.tag}`);
    const discordMessages = await getRecentMessages(readyClient, targetChannelId, 20);
    const bridgeMessages = discordMessages.map(toBridgeMessage);

    console.log(`BridgeMessage count: ${bridgeMessages.length}\n`);
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
  } catch (error) {
    console.error("Discord adapter integration test failed:", error);
    process.exitCode = 1;
  } finally {
    readyClient.destroy();
  }
});

client.login(token).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
