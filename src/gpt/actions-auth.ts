import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireGptActionsAuth(
  request: Request,
): Response | null {
  const apiKey = process.env.GPT_ACTIONS_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      { error: "GPT Actions server configuration is incomplete." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${apiKey}`;

  if (!safeEqual(authorization, expected)) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer realm="gyuniverse-discord-actions"',
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return null;
}
