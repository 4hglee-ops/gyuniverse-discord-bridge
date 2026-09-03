import {
  Routes,
  type REST,
} from "discord.js";

import type { DiscordRestMessage } from "./rest-messages.js";

const DISCORD_EPOCH_MS = 1420070400000n;
const MAX_SEARCH_PAGE_SIZE = 25;
const MAX_SEARCH_RESULTS = 100;
const FALLBACK_MESSAGES_PER_CHANNEL = 100;

export type DiscordMessageSearchSort =
  | "newest"
  | "oldest"
  | "relevance";

export interface SearchGuildMessagesRestOptions {
  content?: string;
  channelIds?: string[];
  authorIds?: string[];
  after?: string;
  before?: string;
  limit?: number;
  sort?: DiscordMessageSearchSort;
}

interface DiscordGuildMessagesSearchResponse {
  doing_deep_historical_index?: boolean;
  documents_indexed?: number;
  total_results: number;
  messages: DiscordRestMessage[][];
}

interface DiscordSearchIndexPendingResponse {
  code: number;
  message: string;
  documents_indexed?: number;
  retry_after?: number;
}

export interface SearchGuildMessagesRestResult {
  totalResults: number;
  messages: DiscordRestMessage[];
  searchMode: "discord-index" | "recent-fallback";
  historyComplete: boolean;
  scannedMessages?: number;
}

export class DiscordSearchIndexPendingError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds?: number) {
    super("Discord message search index is not ready yet.");
    this.name = "DiscordSearchIndexPendingError";
    this.retryAfterSeconds =
      typeof retryAfterSeconds === "number"
        ? retryAfterSeconds
        : null;
  }
}

function parseTimestamp(
  value: string,
  fieldName: "after" | "before",
): number {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `${fieldName} must be a valid date-time string.`,
    );
  }

  if (BigInt(Math.trunc(timestamp)) < DISCORD_EPOCH_MS) {
    throw new Error(
      `${fieldName} must be on or after 2015-01-01T00:00:00.000Z.`,
    );
  }

  return timestamp;
}

function timestampToSnowflake(timestamp: number): string {
  return (
    (BigInt(Math.trunc(timestamp)) - DISCORD_EPOCH_MS) << 22n
  ).toString();
}

function buildBaseSearchParams(
  options: SearchGuildMessagesRestOptions,
): URLSearchParams {
  const params = new URLSearchParams();
  const content = options.content?.trim();

  if (content) {
    if (content.length > 1024) {
      throw new Error("content must be 1024 characters or fewer.");
    }
    params.set("content", content);
  }

  if (options.channelIds) {
    if (options.channelIds.length > 500) {
      throw new Error("channelIds may contain at most 500 channels.");
    }

    for (const channelId of options.channelIds) {
      params.append("channel_id", channelId);
    }
  }

  if (options.authorIds) {
    if (options.authorIds.length > 100) {
      throw new Error("authorIds may contain at most 100 authors.");
    }

    for (const authorId of options.authorIds) {
      params.append("author_id", authorId);
    }
  }

  let afterTimestamp: number | undefined;
  let beforeTimestamp: number | undefined;

  if (options.after) {
    afterTimestamp = parseTimestamp(options.after, "after");
    params.set("min_id", timestampToSnowflake(afterTimestamp));
  }

  if (options.before) {
    beforeTimestamp = parseTimestamp(options.before, "before");
    params.set("max_id", timestampToSnowflake(beforeTimestamp));
  }

  if (
    afterTimestamp !== undefined &&
    beforeTimestamp !== undefined &&
    afterTimestamp >= beforeTimestamp
  ) {
    throw new Error("after must be earlier than before.");
  }

  const sort = options.sort ?? "newest";

  if (sort === "relevance") {
    params.set("sort_by", "relevance");
    params.set("sort_order", "desc");
  } else {
    params.set("sort_by", "timestamp");
    params.set(
      "sort_order",
      sort === "oldest" ? "asc" : "desc",
    );
  }

  return params;
}

function isSearchIndexPending(
  value: unknown,
): value is DiscordSearchIndexPendingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    (value as { code?: unknown }).code === 110000
  );
}

function matchesFallbackFilters(
  message: DiscordRestMessage,
  options: SearchGuildMessagesRestOptions,
): boolean {
  const content = options.content?.trim().toLocaleLowerCase();

  if (
    content &&
    !message.content.toLocaleLowerCase().includes(content)
  ) {
    return false;
  }

  if (
    options.authorIds?.length &&
    !options.authorIds.includes(message.author.id)
  ) {
    return false;
  }

  const timestamp = Date.parse(message.timestamp);

  if (options.after && timestamp <= parseTimestamp(options.after, "after")) {
    return false;
  }

  if (options.before && timestamp >= parseTimestamp(options.before, "before")) {
    return false;
  }

  return true;
}

async function searchRecentMessagesFallback(
  rest: REST,
  options: SearchGuildMessagesRestOptions,
): Promise<SearchGuildMessagesRestResult> {
  const channelIds = options.channelIds ?? [];
  const limit = options.limit ?? 25;
  const matches: DiscordRestMessage[] = [];
  let scannedMessages = 0;

  for (const channelId of channelIds) {
    const recentMessages = await rest.get(
      Routes.channelMessages(channelId),
      {
        query: new URLSearchParams({
          limit: String(FALLBACK_MESSAGES_PER_CHANNEL),
        }),
      },
    ) as DiscordRestMessage[];

    scannedMessages += recentMessages.length;

    for (const message of recentMessages) {
      if (matchesFallbackFilters(message, options)) {
        matches.push(message);
      }
    }
  }

  matches.sort((a, b) => {
    const difference =
      Date.parse(a.timestamp) - Date.parse(b.timestamp);

    return options.sort === "oldest"
      ? difference
      : -difference;
  });

  return {
    totalResults: matches.length,
    messages: matches.slice(0, limit),
    searchMode: "recent-fallback",
    historyComplete: false,
    scannedMessages,
  };
}

export async function searchGuildMessagesRest(
  rest: REST,
  guildId: string,
  options: SearchGuildMessagesRestOptions,
): Promise<SearchGuildMessagesRestResult> {
  const limit = options.limit ?? 25;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_SEARCH_RESULTS
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${MAX_SEARCH_RESULTS}.`,
    );
  }

  const baseParams = buildBaseSearchParams(options);
  const messages = new Map<string, DiscordRestMessage>();
  let totalResults = 0;
  let offset = 0;

  while (messages.size < limit && offset <= 9975) {
    const pageLimit = Math.min(
      MAX_SEARCH_PAGE_SIZE,
      limit - messages.size,
    );
    const params = new URLSearchParams(baseParams);

    params.set("limit", String(pageLimit));
    if (offset > 0) {
      params.set("offset", String(offset));
    }

    const response = await rest.get(
      Routes.guildMessagesSearch(guildId),
      { query: params },
    ) as DiscordGuildMessagesSearchResponse | DiscordSearchIndexPendingResponse;

    if (isSearchIndexPending(response)) {
      return searchRecentMessagesFallback(rest, options);
    }

    totalResults = response.total_results;

    for (const message of response.messages.flat()) {
      if (!messages.has(message.id)) {
        messages.set(message.id, message);
      }

      if (messages.size >= limit) {
        break;
      }
    }

    if (offset + pageLimit >= totalResults) {
      break;
    }

    offset += pageLimit;
  }

  return {
    totalResults,
    messages: [...messages.values()],
    searchMode: "discord-index",
    historyComplete: true,
  };
}
