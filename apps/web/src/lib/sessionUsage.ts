import type {
  OrchestrationV2ProviderTurn,
  UsagePriceItemInput,
  UsageTokenTotals,
} from "@t3tools/contracts";

export interface SessionUsage {
  /** One item per model, ready for `server.priceUsage`. */
  readonly priceItems: readonly UsagePriceItemInput[];
  /** Turns with counts that cannot be priced: they report several models, or no model is known. */
  readonly unpricedTurnCount: number;
  /** All input tokens, cache reads and writes included. */
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

const emptyTotals = (): UsageTokenTotals => ({
  uncachedInputTokens: 0,
  cachedInputTokens: 0,
  cacheCreationTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
});

/**
 * Sums the main agent's token usage of one thread per model.
 * Providers report input with cache reads and writes included, so uncached input is the rest.
 * A turn that reports several models cannot be split, so it is counted as unpriced.
 */
export function summarizeSessionUsage(
  turns: ReadonlyArray<Pick<OrchestrationV2ProviderTurn, "turnTokenUsage">>,
  fallbackModel: string,
): SessionUsage {
  const totalsByModel = new Map<string, UsageTokenTotals>();
  let unpricedTurnCount = 0;
  let inputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  for (const { turnTokenUsage: usage } of turns) {
    // Local command counters describe the command result, not model work.
    if (usage === undefined || usage.localCommand === true) continue;
    if (usage.inputTokens === undefined && usage.outputTokens === undefined) continue;

    const input = usage.inputTokens ?? 0;
    const cacheRead = usage.cachedInputTokens ?? 0;
    const cacheWrite = usage.cacheCreationTokens ?? 0;
    inputTokens += input;
    cacheReadTokens += cacheRead;
    cacheWriteTokens += cacheWrite;

    const models = usage.models ?? [];
    const model = models.length === 0 ? fallbackModel.trim() : models.length === 1 ? models[0] : "";
    if (!model) {
      unpricedTurnCount += 1;
      continue;
    }
    const totals = totalsByModel.get(model) ?? emptyTotals();
    totalsByModel.set(model, {
      uncachedInputTokens: totals.uncachedInputTokens + Math.max(0, input - cacheRead - cacheWrite),
      cachedInputTokens: totals.cachedInputTokens + cacheRead,
      cacheCreationTokens: totals.cacheCreationTokens + cacheWrite,
      outputTokens: totals.outputTokens + (usage.outputTokens ?? 0),
      reasoningTokens: totals.reasoningTokens + (usage.reasoningTokens ?? 0),
    });
  }

  return {
    priceItems: [...totalsByModel].map(([model, totals]) => ({ id: model, model, totals })),
    unpricedTurnCount,
    inputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  };
}

/** Share of input tokens served from the prompt cache, 0 to 100, or null without input. */
export function cacheHitPercent(usage: Pick<SessionUsage, "inputTokens" | "cacheReadTokens">) {
  return usage.inputTokens > 0
    ? Math.round((Math.min(usage.cacheReadTokens, usage.inputTokens) / usage.inputTokens) * 100)
    : null;
}
