import { describe, expect, it } from "vite-plus/test";

import { rankProvidersByMetric, setUsageAccountVisible } from "./usageProviders";

describe("rankProvidersByMetric", () => {
  it("ranks by the selected metric, highest first", () => {
    const totals = [
      { provider: "codex" as const, totalTokens: 100, costUsd: 20 },
      { provider: "claude" as const, totalTokens: 200, costUsd: 10 },
    ];
    const providers = ["codex", "claude"] as const;

    expect(rankProvidersByMetric(providers, totals, "tokens")).toEqual(["claude", "codex"]);
    expect(rankProvidersByMetric(providers, totals, "cost")).toEqual(["codex", "claude"]);
  });

  it("keeps ties in input order without reordering the shared provider list", () => {
    const totals = [
      { provider: "codex" as const, totalTokens: 10, costUsd: 1 },
      { provider: "claude" as const, totalTokens: 10, costUsd: 1 },
      { provider: "grok" as const, totalTokens: 20, costUsd: 2 },
    ];
    const providers = ["claude", "codex", "grok"] as const;

    expect(rankProvidersByMetric(providers, totals, "tokens")).toEqual(["grok", "claude", "codex"]);
    expect(providers).toEqual(["claude", "codex", "grok"]);
  });
});

describe("setUsageAccountVisible", () => {
  const keys = ["work", "personal"];
  const none = { hiddenProviders: [], hiddenSources: [] };

  it("hides one account and keeps the provider visible", () => {
    expect(setUsageAccountVisible(none, "claude", keys, "personal", false)).toEqual({
      hiddenProviders: [],
      hiddenSources: ["personal"],
    });
  });

  it("hides the provider when its last account is hidden", () => {
    const onlyWork = { hiddenProviders: [], hiddenSources: ["personal", "codex-home"] };
    expect(setUsageAccountVisible(onlyWork, "claude", keys, "work", false)).toEqual({
      hiddenProviders: ["claude"],
      hiddenSources: ["codex-home"],
    });
  });

  it("shows only the chosen account of a hidden provider", () => {
    const hidden = { hiddenProviders: ["claude" as const], hiddenSources: [] };
    expect(setUsageAccountVisible(hidden, "claude", keys, "work", true)).toEqual({
      hiddenProviders: [],
      hiddenSources: ["personal"],
    });
  });
});
