import "dotenv/config";
import { createServer } from "node:http";
import { Events } from "discord.js";

import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

import { createDiscordClient } from "../discord/client.js";
import { buildMcpServer } from "./build-server.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  throw new Error(
    "DISCORD_BOT_TOKEN이 .env에 없습니다.",
  );
}

const HOST = "127.0.0.1";
const PORT = 3000;

const discordClient = createDiscordClient();

discordClient.once(
  Events.ClientReady,
  (readyClient) => {
    console.error(
      `Discord 로그인 성공: ${readyClient.user.tag}`,
    );

    const mcpHandler = createMcpHandler(() =>
      buildMcpServer(readyClient),
    );

    const nodeHandler = toNodeHandler(mcpHandler);

    const validateHost =
      localhostHostValidation();

    const validateOrigin =
      localhostOriginValidation();

    const httpServer = createServer(
      (req, res) => {
        const pathname =
          req.url?.split("?")[0] ?? "/";

        if (pathname !== "/mcp") {
          res.statusCode = 404;
          res.end("Not Found");
          return;
        }

        if (
          !validateHost(req, res) ||
          !validateOrigin(req, res)
        ) {
          return;
        }

        void nodeHandler(req, res);
      },
    );

    httpServer.listen(
      PORT,
      HOST,
      () => {
        console.error(
          `HTTP MCP 서버 시작: http://${HOST}:${PORT}/mcp`,
        );
      },
    );
  },
);

discordClient.login(token).catch((error) => {
  console.error("Discord 로그인 실패:");
  console.error(error);
  process.exit(1);
});
