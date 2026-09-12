export type DecisionLedgerStatus =
  | "confirmed"
  | "proposed"
  | "superseded"
  | "rejected"
  | "unclear";

export interface DecisionEvidenceRef {
  source: "notion" | "discord" | "jira" | "github" | "docs";
  label: string;
  note?: string;
}

export interface CurrentDecisionBaselineItem {
  id: string;
  topic: string;
  status: "confirmed";
  decision: string;
  effectiveSince: string;
  scope?: string;
  caveat?: string;
  evidenceStrength: "strong" | "medium";
  evidence: DecisionEvidenceRef[];
}

export interface OpenDecisionBaselineItem {
  id: string;
  topic: string;
  status: "proposed" | "unclear";
  candidates?: string[];
  currentDirection?: string;
  reasonOpen: string;
}

export interface DecisionBaseline {
  version: string;
  updatedAt: string;
  sourceOfTruth: string;
  policy: {
    preserveUntilSuperseded: boolean;
    recentSilenceDoesNotRemoveDecision: boolean;
    newerMessageAloneDoesNotSupersede: boolean;
  };
  currentDecisions: CurrentDecisionBaselineItem[];
  openDecisions: OpenDecisionBaselineItem[];
}

// Public distribution ships with example data only.
// Replace this baseline with decisions validated for your own workspace,
// or move the data into your preferred external configuration layer.
export const DECISION_BASELINE: DecisionBaseline = {
  version: "example-1.0.0",
  updatedAt: "2026-01-01T00:00:00.000Z",
  sourceOfTruth: "docs/DECISION_BASELINE.example.md",
  policy: {
    preserveUntilSuperseded: true,
    recentSilenceDoesNotRemoveDecision: true,
    newerMessageAloneDoesNotSupersede: true,
  },
  currentDecisions: [
    {
      id: "DL-01",
      topic: "Development Workflow",
      status: "confirmed",
      decision: "Work item → branch → commit → pull request → review → merge → done",
      effectiveSince: "2026-01-01",
      evidenceStrength: "strong",
      evidence: [
        { source: "docs", label: "Example team workflow" },
      ],
    },
  ],
  openDecisions: [
    {
      id: "DL-02",
      topic: "Iteration Length",
      status: "proposed",
      candidates: ["1 week", "2 weeks"],
      reasonOpen: "The team has discussed options but has not confirmed one.",
    },
  ],
};
