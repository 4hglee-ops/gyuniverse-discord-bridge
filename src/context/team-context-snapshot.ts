import type { REST } from "discord.js";

import { toBridgeMessageRest } from "../adapters/discord-rest-message-adapter.js";
import { listTextChannelsRest } from "../discord/rest-channels.js";
import { getRecentMessagesRest } from "../discord/rest-messages.js";
import type { BridgeMessage } from "../types/message.js";

export interface TeamContextSnapshotOptions {
  rest: REST;
  guildId: string;
  guildName: string;
  channelIds?: string[];
  since?: string;
  perChannelLimit?: number;
}

export interface TeamContextChannelSnapshot {
  channelId: string;
  channelName: string;
  fetchedMessages: number;
  returnedMessages: number;
  oldestFetchedAt: string | null;
  newestFetchedAt: string | null;
  windowComplete: boolean;
}

export interface TeamContextSnapshot {
  snapshotAt: string;
  source: "discord";
  server: {
    id: string;
    name: string;
  };
  scope: {
    since: string | null;
    perChannelLimit: number;
    channelCount: number;
  };
  freshness: {
    newestMessageAt: string | null;
  };
  completeness: {
    historyComplete: boolean;
    note: string;
  };
  channels: TeamContextChannelSnapshot[];
  authors: Array<{
    authorId: string;
    authorName: string;
  }>;
  messageCount: number;
  messages: BridgeMessage[];
}

export async function createTeamContextSnapshot(
  options: TeamContextSnapshotOptions,
): Promise<TeamContextSnapshot> {
  const {
    rest,
    guildId,
    guildName,
    channelIds,
    since,
    perChannelLimit = 50,
  } = options;

  if (!Number.isInteger(perChannelLimit) || perChannelLimit < 1 || perChannelLimit > 100) {
    throw new Error("perChannelLimit must be an integer between 1 and 100.");
  }

  const snapshotAt = new Date().toISOString();
  const sinceTimestamp = since ? Date.parse(since) : null;

  if (since && Number.isNaN(sinceTimestamp)) {
    throw new Error(`since must be a valid date-time: ${since}`);
  }

  const accessibleChannels = await listTextChannelsRest(rest, guildId);
  const channelById = new Map(
    accessibleChannels.map((channel) => [channel.id, channel]),
  );

  const requestedChannelIds = channelIds?.length
    ? [...new Set(channelIds)]
    : accessibleChannels.map((channel) => channel.id);

  const inaccessibleChannelIds = requestedChannelIds.filter(
    (channelId) => !channelById.has(channelId),
  );

  if (inaccessibleChannelIds.length > 0) {
    throw new Error(
      `Discord channels are not accessible: ${inaccessibleChannelIds.join(", ")}`,
    );
  }

  const messages: BridgeMessage[] = [];
  const channelSnapshots: TeamContextChannelSnapshot[] = [];

  for (const channelId of requestedChannelIds) {
    const channel = channelById.get(channelId)!;
    const discordMessages = await getRecentMessagesRest(
      rest,
      channelId,
      perChannelLimit,
    );

    const bridgeMessages = discordMessages.map((message) =>
      toBridgeMessageRest(message, {
        guildId,
        guildName,
        channelId,
        channelName: channel.name,
      }),
    );

    const filteredMessages = sinceTimestamp === null
      ? bridgeMessages
      : bridgeMessages.filter(
          (message) => Date.parse(message.timestamp) >= sinceTimestamp,
        );

    messages.push(...filteredMessages);

    const timestamps = bridgeMessages
      .map((message) => message.timestamp)
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    const oldestFetchedAt = timestamps[0] ?? null;
    const newestFetchedAt = timestamps.at(-1) ?? null;

    const reachedSinceBoundary =
      sinceTimestamp !== null &&
      oldestFetchedAt !== null &&
      Date.parse(oldestFetchedAt) <= sinceTimestamp;

    const exhaustedRecentHistory = discordMessages.length < perChannelLimit;

    channelSnapshots.push({
      channelId,
      channelName: channel.name,
      fetchedMessages: bridgeMessages.length,
      returnedMessages: filteredMessages.length,
      oldestFetchedAt,
      newestFetchedAt,
      windowComplete:
        sinceTimestamp !== null &&
        (reachedSinceBoundary || exhaustedRecentHistory),
    });
  }

  messages.sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );

  const authors = Array.from(
    new Map(
      messages.map((message) => [
        message.authorId,
        {
          authorId: message.authorId,
          authorName: message.authorName,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.authorName.localeCompare(b.authorName));

  const historyComplete =
    sinceTimestamp !== null &&
    channelSnapshots.every((channel) => channel.windowComplete);

  return {
    snapshotAt,
    source: "discord",
    server: {
      id: guildId,
      name: guildName,
    },
    scope: {
      since: since ?? null,
      perChannelLimit,
      channelCount: requestedChannelIds.length,
    },
    freshness: {
      newestMessageAt:
        messages.length > 0
          ? messages.at(-1)!.timestamp
          : null,
    },
    completeness: {
      historyComplete,
      note:
        sinceTimestamp === null
          ? "Recent-message bounded snapshot; this does not represent complete history."
          : historyComplete
            ? "Each channel was checked back to the requested since boundary."
            : "At least one channel reached perChannelLimit, so more messages may exist after since.",
    },
    channels: channelSnapshots,
    authors,
    messageCount: messages.length,
    messages,
  };
}
