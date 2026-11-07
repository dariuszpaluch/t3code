import { useAtomValue } from "@effect/atom-react";
import type {
  EnvironmentId,
  OrchestrationV2ProviderTurn,
  OrchestrationV2ProviderTurnTokenUsage,
  ProviderInstanceId,
  ServerProvider,
  ServerProviderUsageWindow,
  UsageLimitSourceSnapshots,
  UsagePriceItemInput,
} from "@t3tools/contracts";
import { formatTokens, formatUsd } from "@t3tools/shared/usageFormat";
import {
  collectProviderUsageLimits,
  formatDuration,
  type LimitPace,
  limitsNotice,
  paceOf,
  remainingPercent,
} from "@t3tools/shared/usageLimits";
import { AsyncResult } from "effect/reactivity";
import type { ReactNode } from "react";

import { usePrimarySettings } from "../../hooks/useSettings";
import { useNowMinute } from "../../hooks/useNowMinute";
import type { ContextWindowSnapshot } from "@t3tools/client-runtime/state/context-window";
import { formatContextWindowTokens } from "../../lib/contextWindow";
import { cacheHitPercent, summarizeSessionUsage } from "../../lib/sessionUsage";
import { cn } from "../../lib/utils";
import { serverEnvironment } from "../../state/server";
import { formatUpcomingTimestamp } from "../../timestampFormat";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { formatContextWindowCompactionMessage } from "./ContextWindowMeter.logic";
import { ThreadDetailsSection } from "./ThreadDetailsSection";

const PACE_LABEL: Record<LimitPace, string> = {
  ahead: "Ahead of pace",
  on: "On pace",
  under: "Under pace",
};

export interface ThreadDetailsUsageInput {
  readonly providerInstanceId: ProviderInstanceId | null;
  readonly providers: readonly ServerProvider[];
  readonly sources: UsageLimitSourceSnapshots;
  readonly contextWindow: ContextWindowSnapshot | null;
}

type UsageTone = "error" | "warning" | null;

/** The selected provider's limit windows. Each row reads as room left. */
export function ThreadDetailsUsage({
  providerInstanceId,
  providers,
  sources,
}: Omit<ThreadDetailsUsageInput, "contextWindow">) {
  const nowMinute = useNowMinute();
  const now = Date.parse(`${nowMinute}:00Z`);
  const report =
    providerInstanceId !== null
      ? collectProviderUsageLimits(providerInstanceId, providers, sources, now)
      : null;
  // Only this instance's data: the report keeps one instance per login, and any other entry may be
  // a different login or workspace, so fall back to the instance's own snapshot.
  const limits =
    report?.accounts.find((entry) => entry.instanceId === providerInstanceId)?.limits ??
    providers.find((provider) => provider.instanceId === providerInstanceId)?.usageLimits;
  if (!limits) return null;
  const notice = limitsNotice(limits);

  return (
    <ThreadDetailsSection
      headingId="thread-details-usage-heading"
      title="Usage limits"
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        {notice ? (
          <UsageRow
            label="Limits"
            fill={null}
            tone={null}
            value="Unavailable"
            tooltip={<span className="text-foreground">{notice}</span>}
          />
        ) : (
          limits.windows.map((window) => <LimitRow key={window.id} window={window} now={now} />)
        )}
      </div>
    </ThreadDetailsSection>
  );
}

/** The thread's context window. The bar fills as context is used; the tick marks auto-compaction. */
export function ThreadDetailsContext({ usage }: { readonly usage: ContextWindowSnapshot }) {
  const maxTokens = usage.maxTokens != null && usage.maxTokens > 0 ? usage.maxTokens : null;
  const used =
    maxTokens !== null && usage.usedPercentage !== null
      ? Math.round(Math.max(0, Math.min(100, usage.usedPercentage)))
      : null;
  const threshold = usage.autoCompactThreshold ?? null;
  const tick =
    maxTokens !== null && threshold !== null && threshold > 0 && threshold < maxTokens
      ? (threshold / maxTokens) * 100
      : null;
  const usedTokens = formatContextWindowTokens(usage.usedTokens);
  return (
    <ThreadDetailsSection
      headingId="thread-details-context-heading"
      title="Context window"
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        <UsageRow
          label="Context"
          fill={used}
          tone={used === null ? null : used >= 90 ? "error" : used >= 80 ? "warning" : null}
          tick={tick}
          muted
          value={
            maxTokens !== null
              ? `${usedTokens} / ${formatContextWindowTokens(maxTokens)}`
              : usedTokens
          }
          ariaValue={used !== null ? `${used}% used` : `${usedTokens} tokens used`}
          tooltip={
            <>
              <span className="text-foreground">
                {used !== null ? `Context: ${used}% used` : `Context: ${usedTokens} tokens used`}
              </span>
              {maxTokens !== null ? (
                <span className="text-muted-foreground">
                  {usage.usedTokens.toLocaleString("en-US")} of {maxTokens.toLocaleString("en-US")}{" "}
                  tokens
                </span>
              ) : null}
              {threshold !== null && threshold > 0 ? (
                <span className="text-muted-foreground">
                  {formatContextWindowCompactionMessage(null, threshold)}
                </span>
              ) : null}
            </>
          }
        />
      </div>
    </ThreadDetailsSection>
  );
}

export interface ThreadDetailsSessionInput {
  readonly environmentId: EnvironmentId;
  readonly providerTurns: ReadonlyArray<Pick<OrchestrationV2ProviderTurn, "turnTokenUsage">>;
  /** Prices turns that do not report their model. */
  readonly fallbackModel: string;
  readonly liveUsage: OrchestrationV2ProviderTurnTokenUsage | null;
}

/** Session cost and prompt cache of the thread, like a terminal status line. */
export function ThreadDetailsSession({
  environmentId,
  providerTurns,
  fallbackModel,
  liveUsage,
}: ThreadDetailsSessionInput) {
  const nowMinute = useNowMinute();
  const now = Date.parse(`${nowMinute}:00Z`);
  const usage = summarizeSessionUsage(providerTurns, fallbackModel);
  if (usage.priceItems.length === 0 && usage.inputTokens === 0) return null;

  const hit = cacheHitPercent(usage);
  const expiresAt = cacheExpiresAt(liveUsage);
  const minutesLeft = expiresAt === null ? null : Math.ceil((expiresAt - now) / 60_000);
  const warm = minutesLeft !== null && minutesLeft > 0;

  return (
    <ThreadDetailsSection
      headingId="thread-details-session-heading"
      title="Session"
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        {usage.priceItems.length > 0 ? (
          <SessionCostRow
            environmentId={environmentId}
            items={usage.priceItems}
            unpricedTurnCount={usage.unpricedTurnCount}
          />
        ) : null}
        <UsageRow
          label="Cache"
          fill={hit}
          tone={null}
          muted
          value={`${hit ?? 0}%${minutesLeft === null ? "" : warm ? ` · ${minutesLeft}m` : " · cold"}`}
          ariaValue={`${hit ?? 0}% of input read from cache`}
          tooltip={
            <>
              <span className="text-foreground">Cache: {hit ?? 0}% of input read from cache</span>
              <span className="text-muted-foreground">
                Read {formatTokens(usage.cacheReadTokens)} · written{" "}
                {formatTokens(usage.cacheWriteTokens)} · input {formatTokens(usage.inputTokens)}
              </span>
              {minutesLeft !== null ? (
                <span className="text-muted-foreground">
                  {warm
                    ? `Expires in about ${minutesLeft}m if the thread stays idle`
                    : "Expired: the next message writes the cache again"}
                </span>
              ) : null}
            </>
          }
        />
      </div>
    </ThreadDetailsSection>
  );
}

/** The provider's expiry time, or the last update plus the cache lifetime. Null when unknown. */
function cacheExpiresAt(liveUsage: OrchestrationV2ProviderTurnTokenUsage | null): number | null {
  if (liveUsage === null) return null;
  const reported = liveUsage.promptCacheExpiresAt
    ? Date.parse(liveUsage.promptCacheExpiresAt)
    : NaN;
  if (Number.isFinite(reported)) return reported;
  const updatedAt = Date.parse(liveUsage.updatedAt);
  return liveUsage.promptCacheTtlMs !== undefined && Number.isFinite(updatedAt)
    ? updatedAt + liveUsage.promptCacheTtlMs
    : null;
}

function SessionCostRow({
  environmentId,
  items,
  unpricedTurnCount,
}: {
  readonly environmentId: EnvironmentId;
  readonly items: readonly UsagePriceItemInput[];
  readonly unpricedTurnCount: number;
}) {
  const result = useAtomValue(serverEnvironment.priceUsage({ environmentId, input: { items } }));
  // Servers without server.priceUsage (for example the official nightly) answer with an error.
  if (result._tag === "Failure") {
    return (
      <UsageRow
        label="Cost"
        fill={null}
        tone={null}
        value="Unavailable"
        tooltip={<span className="text-foreground">This server cannot price usage</span>}
      />
    );
  }
  const priced = AsyncResult.getOrElse(result, () => null);
  if (priced === null) {
    return <UsageRow label="Cost" fill={null} tone={null} value="…" tooltip="Pricing usage" />;
  }

  const total = priced.items.reduce((sum, item) => sum + item.costUsd, 0);
  const unpricedModels = priced.items.filter((item) => item.costSource === "unpriced");
  const partial = unpricedModels.length > 0 || unpricedTurnCount > 0;
  const allUnpriced = unpricedModels.length === priced.items.length;
  return (
    <UsageRow
      label="Cost"
      fill={null}
      tone={null}
      value={allUnpriced ? "Unpriced" : `${formatUsd(total)}${partial ? "+" : ""} est.`}
      ariaValue={allUnpriced ? "Unpriced" : `about ${formatUsd(total)} at API prices`}
      tooltip={
        <>
          <span className="text-foreground">
            API price of this thread: about {formatUsd(total)}
          </span>
          <span className="text-muted-foreground">
            Main agent only, priced with the Usage rates
          </span>
          {priced.items.map((item) => (
            <span key={item.id} className="text-muted-foreground">
              {item.id}: {item.costSource === "unpriced" ? "no price" : formatUsd(item.costUsd)}
            </span>
          ))}
          {unpricedTurnCount > 0 ? (
            <span className="text-muted-foreground">
              {unpricedTurnCount} turn(s) with several or unknown models are not included
            </span>
          ) : null}
        </>
      }
    />
  );
}

function LimitRow({
  window,
  now,
}: {
  readonly window: ServerProviderUsageWindow;
  readonly now: number;
}) {
  const timestampFormat = usePrimarySettings((settings) => settings.timestampFormat);
  const left = remainingPercent(window);
  const pace = paceOf(window, now);
  const resetsAt = window.resetsAt ? Date.parse(window.resetsAt) : Number.NaN;
  // The reset time is in the row, so it can be read without the tooltip.
  const resetsIn = resetsAt > now ? ` · ${formatDuration(resetsAt - now)}` : "";
  return (
    <UsageRow
      label={window.label}
      fill={left}
      tone={left <= 10 ? "error" : left <= 20 ? "warning" : null}
      value={`${left}%${resetsIn}`}
      ariaValue={`${left}% left`}
      tooltip={
        <>
          <span className="text-foreground">
            {window.label}: {left}% left
          </span>
          {window.resetsAt && resetsAt > now ? (
            <span className="text-muted-foreground">
              Resets in {formatDuration(resetsAt - now)} ·{" "}
              {formatUpcomingTimestamp(window.resetsAt, timestampFormat, now)}
            </span>
          ) : null}
          {pace ? <span className="text-muted-foreground">{PACE_LABEL[pace]}</span> : null}
        </>
      }
    />
  );
}

/** One label, hairline, and value row; the whole row opens the details tooltip. */
function UsageRow({
  label,
  fill,
  tone,
  tick = null,
  value,
  ariaValue = value,
  tooltip,
  muted = false,
}: {
  readonly label: string;
  /** Bar fill from 0 to 100. Null hides the bar. */
  readonly fill: number | null;
  readonly tone: UsageTone;
  /** A marker on the bar, from 0 to 100. */
  readonly tick?: number | null;
  readonly value: string;
  readonly ariaValue?: string;
  readonly tooltip: ReactNode;
  readonly muted?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            tabIndex={0}
            aria-label={`${label}: ${ariaValue}`}
            className="col-span-3 grid h-6 cursor-default grid-cols-subgrid items-center rounded-lg px-2.5 outline-none hover:bg-black/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:bg-black/[0.035] dark:hover:bg-white/[0.08] dark:data-popup-open:bg-white/[0.08]"
          />
        }
      >
        <span className="max-w-28 truncate text-muted-foreground">{label}</span>
        {fill !== null ? (
          <span className="relative h-[3px] rounded-full bg-muted-foreground/30 dark:bg-muted-foreground/20">
            {fill > 0 ? (
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  tone === "error"
                    ? "bg-error"
                    : tone === "warning"
                      ? "bg-warning"
                      : muted
                        ? "bg-muted-foreground"
                        : "bg-foreground/80",
                )}
                style={{ width: `max(${fill}%, 6px)` }}
              />
            ) : null}
            {tick !== null ? (
              <span
                aria-hidden
                className="absolute -top-[3px] h-[9px] w-px -translate-x-1/2 bg-foreground/60"
                style={{ left: `${tick}%` }}
              />
            ) : null}
          </span>
        ) : null}
        <span
          className={cn(
            // Text-only rows span the bar column so they never widen the shared value column.
            "text-end font-medium tabular-nums",
            fill === null && "col-span-2",
            tone === "error"
              ? "text-error-foreground"
              : tone === "warning"
                ? "text-warning-foreground"
                : fill === null
                  ? "text-muted-foreground"
                  : "text-foreground/80",
          )}
        >
          {value}
        </span>
      </TooltipTrigger>
      {/* Rows sit 8px inside the card; clear its edge instead of overlapping it. */}
      <TooltipPopup side="left" sideOffset={16}>
        <div className="flex flex-col gap-0.5">{tooltip}</div>
      </TooltipPopup>
    </Tooltip>
  );
}
