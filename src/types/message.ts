export interface BridgeMessage {
  id: string;
  source: "discord";

  serverId: string;
  serverName: string;

  channelId: string;
  channelName: string;

  authorId: string;
  authorName: string;

  content: string;
  timestamp: string;

  attachments: BridgeAttachment[];
}

export interface BridgeAttachment {
  id: string;
  name: string;
  url: string;
  contentType: string | null;
}
