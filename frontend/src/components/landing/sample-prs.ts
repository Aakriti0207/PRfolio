export type SamplePrState = "OPEN" | "CLOSED" | "MERGED";

export type SamplePr = {
  id: number;
  title: string;
  repo: string;
  language: string;
  number: number;
  state: SamplePrState;
};

export const stateLabel: Record<SamplePrState, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  MERGED: "Merged",
};

export const stateClass: Record<SamplePrState, string> = {
  OPEN: "open",
  CLOSED: "closed",
  MERGED: "merged",
};

// Sample data for the landing page demo only. The real data comes from the API.
export const samplePrs: SamplePr[] = [
  { id: 1, title: "fix: preserve OpenAPI query parameters on import", repo: "foss42/apidash", language: "Dart", number: 1867, state: "CLOSED" },
  { id: 2, title: "feat: add Canadian French payment link locale", repo: "juspay/hyperswitch", language: "Rust", number: 14834, state: "OPEN" },
  { id: 3, title: "fix: prevent import dialog header overflow", repo: "foss42/apidash", language: "Dart", number: 1851, state: "OPEN" },
  { id: 4, title: "feat: initialize i18next foundation for localization", repo: "OrchestratorInc/agent-orchestrator", language: "Go", number: 2503, state: "CLOSED" },
  { id: 5, title: "feat(web): add wallet address copy button", repo: "drydocs/meridian", language: "TypeScript", number: 89, state: "MERGED" },
  { id: 6, title: "feat: add english and french translations", repo: "drydocs/meridian", language: "TypeScript", number: 225, state: "MERGED" },
];