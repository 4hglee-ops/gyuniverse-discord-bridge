import "dotenv/config";
import { createServer } from "node:http";

import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";

import { createDiscordRestClient } from "../discord/rest-client.js";
import { buildRestMcpServer } from "./build-rest-server.js";

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const guildName = process.env.DISCORD_GUILD_NAME;

if (!token) {
  throw new Error(
    "DISCORD_BOT_TOKEN이 .env에 없습니다.",
  );
}

if (!guildId) {
  throw new Error(
    "DISCORD_GUILD_ID가 .env에 없습니다.",
  );
}

if (!guildName) {
  throw new Error(
    "DISCORD_GUILD_NAME이 .env에 없습니다.",
  );
}

const HOST = "127.0.0.1";
const PORT = 3000;

const rest = createDiscordRestClient(token);

const mcpHandler = createMcpHandler(() =>
  buildRestMcpServer({
    rest,
    guildId,
    guildName,
  }),
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
      `REST HTTP MCP 서버 시작: http://${HOST}:${PORT}/mcp`,
    );
  },
);
