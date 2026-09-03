import "dotenv/config";
import { Events } from "discord.js";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createDiscordClient } from "../discord/client.js";
import { buildMcpServer } from "./build-server.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error(
    "DISCORD_BOT_TOKEN이 .env에 없습니다.",
  );
}

const discordClient = createDiscordClient();

discordClient.once(
  Events.ClientReady,
  async (readyClient) => {
    console.error(
      `Discord 로그인 성공: ${readyClient.user.tag}`,
    );

    console.error(
      "MCP Tool 등록 완료: list_discord_channels",
    );
    console.error(
      "MCP Tool 등록 완료: get_recent_discord_messages",
    );
    console.error("stdio 연결 대기 중...");

    serveStdio(() =>
      buildMcpServer(readyClient),
    );
  },
);

discordClient.login(token).catch((error) => {
  console.error("Discord 로그인 실패:");
  console.error(error);
  process.exit(1);
});
