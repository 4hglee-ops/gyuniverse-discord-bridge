import { REST } from "discord.js";

export function createDiscordRestClient(
  token: string,
): REST {
  return new REST({
    version: "10",
  }).setToken(token);
}
