import { ChannelType, Routes, type REST } from "discord.js";
import type { DiscordRestMessage } from "./rest-messages.js";

export interface DiscordApiThread {
  id: string;
  name?: string;
  guild_id?: string;
  parent_id?: string | null;
  type: number;
  message_count?: number;
  last_message_id?: string | null;
  thread_metadata?: {
    archived?: boolean;
    archive_timestamp?: string;
  };
}

interface DiscordThreadListResponse {
  threads: DiscordApiThread[];
  members?: Array<{ id: string }>;
  has_more?: boolean;
}

export interface DiscordThreadSummary {
  id: string;
  name: string;
  parentChannelId: string;
  serverId: string;
  isPrivate: boolean;
  archived: boolean;
  archiveTimestamp: string | null;
  messageCount: number | null;
  lastMessageId: string | null;
}

export interface ListChannelThreadsOptions {
  status?: "active" | "archived" | "all";
  archiveLimit?: number;
  beforePublic?: string;
  beforePrivate?: string;
}

function isThreadType(type: number): boolean {
  return type === ChannelType.PublicThread || type === ChannelType.PrivateThread;
}

export function summarizeThread(thread: DiscordApiThread, guildId: string): DiscordThreadSummary {
  return {
    id: thread.id,
    name: thread.name ?? thread.id,
    parentChannelId: thread.parent_id ?? "",
    serverId: guildId,
    isPrivate: thread.type === ChannelType.PrivateThread,
    archived: Boolean(thread.thread_metadata?.archived),
    archiveTimestamp: thread.thread_metadata?.archive_timestamp ?? null,
    messageCount: thread.message_count ?? null,
    lastMessageId: thread.last_message_id ?? null,
  };
}

export async function listActiveGuildThreadsRest(
  rest: REST, guildId: string,
): Promise<DiscordApiThread[]> {
  const response = await rest.get(Routes.guildActiveThreads(guildId)) as DiscordThreadListResponse;
  const joined = new Set((response.members ?? []).map(member => member.id));
  return (response.threads ?? []).filter(thread =>
    isThreadType(thread.type) &&
    (!thread.guild_id || thread.guild_id === guildId) &&
    // Manage Threads may expose private discussions that the bot never joined.
    (thread.type !== ChannelType.PrivateThread || joined.has(thread.id)),
  );
}

export async function listChannelThreadsRest(
  rest: REST, guildId: string, parentId: string,
  options: ListChannelThreadsOptions = {},
): Promise<{
  threads: DiscordThreadSummary[];
  hasMorePublic: boolean;
  hasMorePrivate: boolean;
  nextBeforePublic: string | null;
  nextBeforePrivate: string | null;
}> {
  const status = options.status ?? "all";
  const archiveLimit = options.archiveLimit ?? 25;
  if (!Number.isInteger(archiveLimit) || archiveLimit < 1 || archiveLimit > 100) {
    throw new Error("archiveLimit must be an integer between 1 and 100.");
  }
  const active = status === "archived"
    ? []
    : (await listActiveGuildThreadsRest(rest, guildId)).filter(t => t.parent_id === parentId);

  let publicArchived: DiscordThreadListResponse = { threads: [] };
  let joinedPrivateArchived: DiscordThreadListResponse = { threads: [] };
  if (status !== "active") {
    const publicQuery = new URLSearchParams({ limit: String(archiveLimit) });
    const privateQuery = new URLSearchParams({ limit: String(archiveLimit) });
    if (options.beforePublic) publicQuery.set("before", options.beforePublic);
    if (options.beforePrivate) privateQuery.set("before", options.beforePrivate);
    [publicArchived, joinedPrivateArchived] = await Promise.all([
      rest.get(Routes.channelThreads(parentId, "public"), { query: publicQuery }) as Promise<DiscordThreadListResponse>,
      // Only the private archives *joined by this bot*; never use the all-private route.
      rest.get(Routes.channelJoinedArchivedThreads(parentId), { query: privateQuery }) as Promise<DiscordThreadListResponse>,
    ]);
  }

  const seen = new Set<string>();
  const threads: DiscordThreadSummary[] = [];
  for (const thread of [
    ...active,
    ...(publicArchived.threads ?? []),
    ...(joinedPrivateArchived.threads ?? []),
  ]) {
    if (thread.parent_id !== parentId || !isThreadType(thread.type)) continue;
    if (thread.guild_id && thread.guild_id !== guildId) continue;
    if (seen.has(thread.id)) continue;
    seen.add(thread.id);
    threads.push(summarizeThread(thread, guildId));
  }

  const lastPublic = publicArchived.threads?.at(-1);
  const lastPrivate = joinedPrivateArchived.threads?.at(-1);
  return {
    threads,
    hasMorePublic: Boolean(publicArchived.has_more),
    hasMorePrivate: Boolean(joinedPrivateArchived.has_more),
    nextBeforePublic: publicArchived.has_more ? lastPublic?.thread_metadata?.archive_timestamp ?? null : null,
    nextBeforePrivate: joinedPrivateArchived.has_more ? lastPrivate?.id ?? null : null,
  };
}

export async function getThreadRest(
  rest: REST, guildId: string, parentId: string, threadId: string,
): Promise<DiscordThreadSummary | null> {
  const thread = await rest.get(Routes.channel(threadId)) as DiscordApiThread;
  if (!isThreadType(thread.type) || thread.guild_id !== guildId || thread.parent_id !== parentId) {
    return null;
  }
  if (thread.type === ChannelType.PrivateThread) {
    // A bot with MANAGE_THREADS must not read an unjoined private thread via MCP.
    try {
      await rest.get(Routes.threadMembers(threadId, "@me"));
    } catch {
      return null;
    }
  }
  return summarizeThread(thread, guildId);
}

export async function getThreadMessagesPageRest(
  rest: REST, threadId: string, limit = 50, before?: string,
): Promise<DiscordRestMessage[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  if (before && !/^\d{1,22}$/.test(before)) {
    throw new Error("before must be a Discord message ID (snowflake).");
  }
  const query = new URLSearchParams({ limit: String(limit) });
  if (before) query.set("before", before);
  const messages = await rest.get(Routes.channelMessages(threadId), { query }) as DiscordRestMessage[];
  return [...messages].reverse();
}

export async function getThreadStarterMessageRest(
  rest: REST, parentId: string, threadId: string,
): Promise<DiscordRestMessage | null> {
  try {
    // For threads started from a parent message, the thread ID is that message ID.
    return await rest.get(Routes.channelMessage(parentId, threadId)) as DiscordRestMessage;
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    if (status === 403 || status === 404) return null;
    throw error;
  }
}
