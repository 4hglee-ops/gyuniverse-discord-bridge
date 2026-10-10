export type BridgeRole = "admin" | "member" | "viewer";
export type GuildAccessMode = "all_channels" | "selected_channels";

export interface Principal {
  kind: "legacy" | "personal";
  userId: string;
  role: BridgeRole;
  credentialId?: string;
}

export interface GuildGrant {
  id: string;
  name: string;
  mode: GuildAccessMode;
  allowedChannelIds: ReadonlySet<string>;
}

export interface AccessScope {
  principal: Principal;
  guilds: readonly GuildGrant[];
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Discord resource is not accessible.");
    this.name = "AccessDeniedError";
  }
}

export class ScopeSelectionError extends Error {
  constructor() {
    super("serverId is required when multiple Discord servers are accessible.");
    this.name = "ScopeSelectionError";
  }
}
