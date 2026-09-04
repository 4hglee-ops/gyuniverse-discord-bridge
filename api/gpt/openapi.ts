export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;

  const channelIdsParameter = {
    name: "channelIds",
    in: "query",
    required: false,
    description: "Comma-separated Discord channel IDs. Omit for all accessible channels.",
    schema: { type: "string" },
  };

  const sinceParameter = {
    name: "since",
    in: "query",
    required: false,
    description: "ISO 8601 start time for the context window.",
    schema: { type: "string", format: "date-time" },
  };

  const perChannelLimitParameter = {
    name: "perChannelLimit",
    in: "query",
    required: false,
    description: "Maximum recent messages fetched per channel. Defaults to 50.",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  };

  return Response.json({
    openapi: "3.1.0",
    info: {
      title: "Gyuniverse Discord GPT Actions",
      version: "1.5.0",
      description:
        "Read-only team-context Actions with Decision Baseline, Team Brief, Delta Brief v2, signed checkpoints, state diff, and Discord evidence search.",
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/gpt/v1/channels": {
        get: {
          operationId: "listDiscordChannels",
          summary: "List accessible Discord text channels",
          description: "Lists text channels that the configured Discord bot can access.",
          responses: {
            "200": {
              description: "Accessible Discord channels",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["guild", "channels"],
                    properties: {
                      guild: { $ref: "#/components/schemas/Guild" },
                      channels: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Channel" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/messages": {
        get: {
          operationId: "getRecentDiscordMessages",
          summary: "Read recent messages from one Discord channel",
          description: "Use for focused single-channel reading.",
          parameters: [
            {
              name: "channelId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Recent Discord messages",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["channel", "messages"],
                    properties: {
                      channel: { $ref: "#/components/schemas/Channel" },
                      messages: {
                        type: "array",
                        items: { $ref: "#/components/schemas/BridgeMessage" },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/api/gpt/v1/context-snapshot": {
        get: {
          operationId: "getTeamContextSnapshot",
          summary: "Build the shared Discord Evidence Pack",
          description: "Collects recent messages with freshness and completeness metadata.",
          parameters: [channelIdsParameter, sinceParameter, perChannelLimitParameter],
          responses: {
            "200": {
              description: "Team Context Snapshot",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamContextSnapshot" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/team-brief-context": {
        get: {
          operationId: "getTeamBriefContext",
          summary: "Get current Team Brief context with decision baseline",
          description: "Primary action for current team status and Team Brief v2.2.",
          parameters: [channelIdsParameter, sinceParameter, perChannelLimitParameter],
          responses: {
            "200": {
              description: "Team Brief Context",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamBriefContext" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/decision-ledger-context": {
        get: {
          operationId: "getDecisionLedgerContext",
          summary: "Get current Decision Ledger context",
          description: "Returns Decision Baseline, current Snapshot, and ledger rules.",
          parameters: [channelIdsParameter, sinceParameter, perChannelLimitParameter],
          responses: {
            "200": {
              description: "Decision Ledger Context",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DecisionLedgerContext" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/team-delta-context": {
        get: {
          operationId: "getTeamDeltaContext",
          summary: "Get Delta Brief v2 context",
          description: "Primary action for changes since a prior time or checkpoint.",
          parameters: [
            channelIdsParameter,
            sinceParameter,
            {
              name: "lookbackHours",
              in: "query",
              required: false,
              description: "Used when since is omitted. Defaults to 24 hours.",
              schema: { type: "integer", minimum: 1, maximum: 168, default: 24 },
            },
            perChannelLimitParameter,
          ],
          responses: {
            "200": {
              description: "Delta Brief Context",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TeamDeltaContext" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/state-checkpoint": {
        post: {
          operationId: "createTeamStateCheckpoint",
          summary: "Create a signed Team State Checkpoint",
          description:
            "Signs an already interpreted normalized team state. It does not infer decisions, work status, blockers, questions, or proposals.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateCheckpointRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Signed Team State Checkpoint",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateCheckpointResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/state-diff": {
        post: {
          operationId: "compareTeamStateCheckpoint",
          summary: "Compare a prior checkpoint with current team state",
          description:
            "Computes deterministic added, removed, status_changed, and content_changed transitions and returns a new checkpoint token.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StateDiffRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Deterministic Team State Diff",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/StateDiffResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/api/gpt/v1/search": {
        get: {
          operationId: "searchDiscordMessages",
          summary: "Search Discord history for supporting evidence",
          description: "Use for older decision history, reasons, conflicts, or broader evidence lookup.",
          parameters: [
            { name: "query", in: "query", required: false, schema: { type: "string", maxLength: 1024 } },
            { name: "channelId", in: "query", required: false, schema: { type: "string" } },
            { name: "authorId", in: "query", required: false, schema: { type: "string" } },
            { name: "after", in: "query", required: false, schema: { type: "string", format: "date-time" } },
            { name: "before", in: "query", required: false, schema: { type: "string", format: "date-time" } },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
            },
            {
              name: "sort",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["newest", "oldest", "relevance"], default: "newest" },
            },
          ],
          responses: {
            "200": {
              description: "Discord message search results",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResult" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key" },
      },
      schemas: {
        Guild: {
          type: "object",
          required: ["id", "name"],
          properties: { id: { type: "string" }, name: { type: "string" } },
        },
        Channel: {
          type: "object",
          required: ["id", "name"],
          properties: { id: { type: "string" }, name: { type: "string" } },
        },
        BridgeAttachment: {
          type: "object",
          required: ["id", "name", "url", "contentType"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            url: { type: "string", format: "uri" },
            contentType: { type: ["string", "null"] },
          },
        },
        BridgeMessage: {
          type: "object",
          required: ["id", "source", "serverId", "serverName", "channelId", "channelName", "authorId", "authorName", "content", "timestamp", "attachments"],
          properties: {
            id: { type: "string" },
            source: { type: "string", enum: ["discord"] },
            serverId: { type: "string" },
            serverName: { type: "string" },
            channelId: { type: "string" },
            channelName: { type: "string" },
            authorId: { type: "string" },
            authorName: { type: "string" },
            content: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            attachments: { type: "array", items: { $ref: "#/components/schemas/BridgeAttachment" } },
          },
        },
        TeamContextChannelSnapshot: {
          type: "object",
          required: ["channelId", "channelName", "fetchedMessages", "returnedMessages", "oldestFetchedAt", "newestFetchedAt", "windowComplete"],
          properties: {
            channelId: { type: "string" },
            channelName: { type: "string" },
            fetchedMessages: { type: "integer" },
            returnedMessages: { type: "integer" },
            oldestFetchedAt: { type: ["string", "null"] },
            newestFetchedAt: { type: ["string", "null"] },
            windowComplete: { type: "boolean" },
          },
        },
        TeamContextSnapshot: {
          type: "object",
          required: ["snapshotAt", "source", "server", "scope", "freshness", "completeness", "channels", "authors", "messageCount", "messages"],
          properties: {
            snapshotAt: { type: "string", format: "date-time" },
            source: { type: "string", enum: ["discord"] },
            server: {
              type: "object",
              required: ["id", "name"],
              properties: { id: { type: "string" }, name: { type: "string" } },
            },
            scope: {
              type: "object",
              required: ["since", "perChannelLimit", "channelCount"],
              properties: {
                since: { type: ["string", "null"] },
                perChannelLimit: { type: "integer" },
                channelCount: { type: "integer" },
              },
            },
            freshness: {
              type: "object",
              required: ["newestMessageAt"],
              properties: { newestMessageAt: { type: ["string", "null"] } },
            },
            completeness: {
              type: "object",
              required: ["historyComplete", "note"],
              properties: {
                historyComplete: { type: "boolean" },
                note: { type: "string" },
              },
            },
            channels: { type: "array", items: { $ref: "#/components/schemas/TeamContextChannelSnapshot" } },
            authors: {
              type: "array",
              items: {
                type: "object",
                required: ["authorId", "authorName"],
                properties: {
                  authorId: { type: "string" },
                  authorName: { type: "string" },
                },
              },
            },
            messageCount: { type: "integer" },
            messages: { type: "array", items: { $ref: "#/components/schemas/BridgeMessage" } },
          },
        },
        DecisionEvidenceRef: {
          type: "object",
          required: ["source", "label"],
          properties: {
            source: { type: "string", enum: ["notion", "discord", "jira", "github", "docs"] },
            label: { type: "string" },
            note: { type: "string" },
          },
        },
        CurrentDecisionBaselineItem: {
          type: "object",
          required: ["id", "topic", "status", "decision", "effectiveSince", "evidenceStrength", "evidence"],
          properties: {
            id: { type: "string" },
            topic: { type: "string" },
            status: { type: "string", enum: ["confirmed"] },
            decision: { type: "string" },
            effectiveSince: { type: "string" },
            scope: { type: "string" },
            caveat: { type: "string" },
            evidenceStrength: { type: "string", enum: ["strong", "medium"] },
            evidence: { type: "array", items: { $ref: "#/components/schemas/DecisionEvidenceRef" } },
          },
        },
        OpenDecisionBaselineItem: {
          type: "object",
          required: ["id", "topic", "status", "reasonOpen"],
          properties: {
            id: { type: "string" },
            topic: { type: "string" },
            status: { type: "string", enum: ["proposed", "unclear"] },
            candidates: { type: "array", items: { type: "string" } },
            currentDirection: { type: "string" },
            reasonOpen: { type: "string" },
          },
        },
        DecisionBaseline: {
          type: "object",
          required: ["version", "updatedAt", "sourceOfTruth", "policy", "currentDecisions", "openDecisions"],
          properties: {
            version: { type: "string" },
            updatedAt: { type: "string", format: "date-time" },
            sourceOfTruth: { type: "string" },
            policy: {
              type: "object",
              required: ["preserveUntilSuperseded", "recentSilenceDoesNotRemoveDecision", "newerMessageAloneDoesNotSupersede"],
              properties: {
                preserveUntilSuperseded: { type: "boolean" },
                recentSilenceDoesNotRemoveDecision: { type: "boolean" },
                newerMessageAloneDoesNotSupersede: { type: "boolean" },
              },
            },
            currentDecisions: { type: "array", items: { $ref: "#/components/schemas/CurrentDecisionBaselineItem" } },
            openDecisions: { type: "array", items: { $ref: "#/components/schemas/OpenDecisionBaselineItem" } },
          },
        },
        WorkflowContract: {
          type: "object",
          properties: {
            version: { type: "string" },
            purpose: { type: "string" },
            workflow: { type: "array", items: { type: "string" } },
            sections: { type: "array", items: { type: "string" } },
            decisionStatuses: { type: "array", items: { type: "string" } },
            taskStatuses: { type: "array", items: { type: "string" } },
            evidenceRules: { type: "array", items: { type: "string" } },
            searchWhen: { type: "array", items: { type: "string" } },
          },
        },
        TeamBriefContext: {
          type: "object",
          required: ["mode", "generatedAt", "decisionBaseline", "snapshot", "contract"],
          properties: {
            mode: { type: "string", enum: ["team-brief"] },
            generatedAt: { type: "string", format: "date-time" },
            decisionBaseline: { $ref: "#/components/schemas/DecisionBaseline" },
            snapshot: { $ref: "#/components/schemas/TeamContextSnapshot" },
            contract: { $ref: "#/components/schemas/WorkflowContract" },
          },
        },
        DecisionLedgerContext: {
          type: "object",
          required: ["mode", "generatedAt", "baseline", "snapshot", "contract"],
          properties: {
            mode: { type: "string", enum: ["decision-ledger"] },
            generatedAt: { type: "string", format: "date-time" },
            baseline: { $ref: "#/components/schemas/DecisionBaseline" },
            snapshot: { $ref: "#/components/schemas/TeamContextSnapshot" },
            contract: { $ref: "#/components/schemas/WorkflowContract" },
          },
        },
        TeamDeltaContext: {
          type: "object",
          required: ["mode", "generatedAt", "decisionBaseline", "window", "snapshot", "contract"],
          properties: {
            mode: { type: "string", enum: ["delta-brief"] },
            generatedAt: { type: "string", format: "date-time" },
            decisionBaseline: { $ref: "#/components/schemas/DecisionBaseline" },
            window: {
              type: "object",
              required: ["since", "sinceDefaulted", "lookbackHours"],
              properties: {
                since: { type: "string", format: "date-time" },
                sinceDefaulted: { type: "boolean" },
                lookbackHours: { type: ["integer", "null"] },
              },
            },
            snapshot: { $ref: "#/components/schemas/TeamContextSnapshot" },
            contract: { $ref: "#/components/schemas/WorkflowContract" },
          },
        },
        TeamStateItem: {
          type: "object",
          required: ["id", "status", "summary", "evidenceIds"],
          properties: {
            id: { type: "string" },
            status: { type: "string" },
            summary: { type: "string" },
            evidenceIds: { type: "array", items: { type: "string" } },
          },
        },
        NormalizedTeamState: {
          type: "object",
          required: ["decisions", "work", "blockers", "questions", "proposals"],
          properties: {
            decisions: { type: "array", items: { $ref: "#/components/schemas/TeamStateItem" } },
            work: { type: "array", items: { $ref: "#/components/schemas/TeamStateItem" } },
            blockers: { type: "array", items: { $ref: "#/components/schemas/TeamStateItem" } },
            questions: { type: "array", items: { $ref: "#/components/schemas/TeamStateItem" } },
            proposals: { type: "array", items: { $ref: "#/components/schemas/TeamStateItem" } },
          },
        },
        TeamStateCheckpointMetadata: {
          type: "object",
          required: ["snapshotAt", "baselineVersion", "historyComplete", "newestMessageAt"],
          properties: {
            snapshotAt: { type: "string", format: "date-time" },
            baselineVersion: { type: "string" },
            historyComplete: { type: "boolean" },
            newestMessageAt: { type: ["string", "null"] },
          },
        },
        TeamStateCheckpointPayload: {
          type: "object",
          required: ["version", "createdAt", "metadata", "state"],
          properties: {
            version: { type: "string", enum: ["1"] },
            createdAt: { type: "string", format: "date-time" },
            metadata: { $ref: "#/components/schemas/TeamStateCheckpointMetadata" },
            state: { $ref: "#/components/schemas/NormalizedTeamState" },
          },
        },
        CreateCheckpointRequest: {
          type: "object",
          required: ["state", "metadata"],
          properties: {
            state: { $ref: "#/components/schemas/NormalizedTeamState" },
            metadata: { $ref: "#/components/schemas/TeamStateCheckpointMetadata" },
          },
        },
        CreateCheckpointResponse: {
          type: "object",
          required: ["token", "checkpoint"],
          properties: {
            token: { type: "string" },
            checkpoint: { $ref: "#/components/schemas/TeamStateCheckpointPayload" },
          },
        },
        StateDiffRequest: {
          type: "object",
          required: ["previousCheckpointToken", "currentState", "currentMetadata"],
          properties: {
            previousCheckpointToken: { type: "string" },
            currentState: { $ref: "#/components/schemas/NormalizedTeamState" },
            currentMetadata: { $ref: "#/components/schemas/TeamStateCheckpointMetadata" },
          },
        },
        TeamStateDiffEntry: {
          type: "object",
          required: ["category", "id", "kind", "before", "after"],
          properties: {
            category: { type: "string", enum: ["decisions", "work", "blockers", "questions", "proposals"] },
            id: { type: "string" },
            kind: { type: "string", enum: ["added", "removed", "status_changed", "content_changed"] },
            before: { anyOf: [{ $ref: "#/components/schemas/TeamStateItem" }, { type: "null" }] },
            after: { anyOf: [{ $ref: "#/components/schemas/TeamStateItem" }, { type: "null" }] },
          },
        },
        TeamStateDiff: {
          type: "object",
          required: ["from", "to", "changes", "counts"],
          properties: {
            from: { $ref: "#/components/schemas/TeamStateCheckpointMetadata" },
            to: { $ref: "#/components/schemas/TeamStateCheckpointMetadata" },
            changes: { type: "array", items: { $ref: "#/components/schemas/TeamStateDiffEntry" } },
            counts: {
              type: "object",
              required: ["added", "removed", "statusChanged", "contentChanged", "total"],
              properties: {
                added: { type: "integer" },
                removed: { type: "integer" },
                statusChanged: { type: "integer" },
                contentChanged: { type: "integer" },
                total: { type: "integer" },
              },
            },
          },
        },
        StateDiffResponse: {
          type: "object",
          required: ["previousCheckpoint", "currentCheckpointToken", "currentCheckpoint", "diff"],
          properties: {
            previousCheckpoint: { $ref: "#/components/schemas/TeamStateCheckpointPayload" },
            currentCheckpointToken: { type: "string" },
            currentCheckpoint: { $ref: "#/components/schemas/TeamStateCheckpointPayload" },
            diff: { $ref: "#/components/schemas/TeamStateDiff" },
          },
        },
        SearchResult: {
          type: "object",
          required: ["totalResults", "returnedResults", "searchMode", "historyComplete", "scannedMessages", "messages"],
          properties: {
            totalResults: { type: "integer" },
            returnedResults: { type: "integer" },
            searchMode: { type: "string", enum: ["discord-index", "recent-fallback"] },
            historyComplete: { type: "boolean" },
            scannedMessages: { type: ["integer", "null"] },
            messages: { type: "array", items: { $ref: "#/components/schemas/BridgeMessage" } },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Bearer API key is missing or invalid",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Discord channel not found or inaccessible",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
  });
}
