import type { TurnTokenUsage } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { cacheHitPercent, summarizeSessionUsage } from "./sessionUsage";

const turn = (usage: Partial<TurnTokenUsage>) => ({
  turnTokenUsage: {
    usageScope: "main_agent",
    hasSubagents: false,
    usageStatus: "complete",
    inputTokens: 0,
    outputTokens: 0,
    ...usage,
  } as TurnTokenUsage,
});

describe("summarizeSessionUsage", () => {
  it("sums turns per model and splits uncached input from cache reads and writes", () => {
    const usage = summarizeSessionUsage(
      [
        turn({
          models: ["claude-opus"],
          inputTokens: 1_000,
          cachedInputTokens: 600,
          cacheCreationTokens: 300,
          outputTokens: 50,
        }),
        turn({
          models: ["claude-opus"],
          inputTokens: 2_000,
          cachedInputTokens: 1_800,
          outputTokens: 70,
          reasoningTokens: 20,
        }),
        turn({ models: ["claude-haiku"], inputTokens: 100, outputTokens: 10 }),
      ],
      "fallback",
    );

    expect(usage.priceItems).toEqual([
      {
        id: "claude-opus",
        model: "claude-opus",
        totals: {
          uncachedInputTokens: 300,
          cachedInputTokens: 2_400,
          cacheCreationTokens: 300,
          outputTokens: 120,
          reasoningTokens: 20,
        },
      },
      {
        id: "claude-haiku",
        model: "claude-haiku",
        totals: {
          uncachedInputTokens: 100,
          cachedInputTokens: 0,
          cacheCreationTokens: 0,
          outputTokens: 10,
          reasoningTokens: 0,
        },
      },
    ]);
    expect(usage).toMatchObject({
      unpricedTurnCount: 0,
      inputTokens: 3_100,
      cacheReadTokens: 2_400,
      cacheWriteTokens: 300,
    });
  });

  it("uses the fallback model when a turn reports none", () => {
    const usage = summarizeSessionUsage([turn({ inputTokens: 10, outputTokens: 1 })], " gpt-5 ");
    expect(usage.priceItems.map((item) => item.model)).toEqual(["gpt-5"]);
  });

  it("counts turns with several or unknown models as unpriced, but keeps their cache counts", () => {
    const usage = summarizeSessionUsage(
      [
        turn({ models: ["a", "b"], inputTokens: 10, cachedInputTokens: 4 }),
        turn({ inputTokens: 10, outputTokens: 1 }),
      ],
      "",
    );
    expect(usage.priceItems).toEqual([]);
    expect(usage.unpricedTurnCount).toBe(2);
    expect(usage.cacheReadTokens).toBe(4);
  });

  it("skips local commands and turns without counts", () => {
    const usage = summarizeSessionUsage(
      [
        turn({ localCommand: true, inputTokens: 500 }),
        { turnTokenUsage: undefined },
        turn({ usageStatus: "unavailable", inputTokens: undefined, outputTokens: undefined }),
      ],
      "model",
    );
    expect(usage.priceItems).toEqual([]);
    expect(usage.inputTokens).toBe(0);
  });
});

describe("cacheHitPercent", () => {
  it("is the share of input read from the cache", () => {
    expect(cacheHitPercent({ inputTokens: 3_100, cacheReadTokens: 2_400 })).toBe(77);
  });

  it("is null without input", () => {
    expect(cacheHitPercent({ inputTokens: 0, cacheReadTokens: 0 })).toBeNull();
  });
});
