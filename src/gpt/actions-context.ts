import { createDiscordRestClient } from "../discord/rest-client.js";

export interface GptActionsContext {
  rest: ReturnType<typeof createDiscordRestClient>;
  guildId: string;
  guildName: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createGptActionsContext(): GptActionsContext {
  const token = requiredEnv("DISCORD_BOT_TOKEN");
  const guildId = requiredEnv("DISCORD_GUILD_ID");
  const guildName = requiredEnv("DISCORD_GUILD_NAME");

  return {
    rest: createDiscordRestClient(token),
    guildId,
    guildName,
  };
}
