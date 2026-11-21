// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
import { useAtomValue } from "@effect/atom-react";
// # DPALUCH - changes END [session-cost-cache]
import type {
  // # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
  EnvironmentId,
  OrchestrationV2ProviderTurn,
  OrchestrationV2ProviderTurnTokenUsage,
  // # DPALUCH - changes END [session-cost-cache]
  ProviderInstanceId,
  ServerProvider,
  ServerProviderUsageLimits,
  ServerProviderUsageWindow,
  UsageLimitSourceSnapshots,
  // # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
  UsagePriceItemInput,
  // # DPALUCH - changes END [session-cost-cache]
} from "@t3tools/contracts";
// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
import { formatTokens, formatUsd } from "@t3tools/shared/usageFormat";
// # DPALUCH - changes END [session-cost-cache]
import {
  type LimitPace,
  type LimitPoolWindow,
  paceOf,
  paceRemainingPercent,
  remainingPercent,
} from "@t3tools/shared/usageLimits";
// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
import { AsyncResult } from "effect/reactivity";
// # DPALUCH - changes END [session-cost-cache]
import { formatDuration, limitsNotice } from "@t3tools/shared/usageLimitsCopy";
import { Link } from "@tanstack/react-router";
import { msg, useGT, useLocale, useMessages } from "gt-react";
import type { ReactNode } from "react";

import { usePrimarySettings } from "../../hooks/useSettings";
import { useNowMinute } from "../../hooks/useNowMinute";
import type { ContextWindowSnapshot } from "@t3tools/client-runtime/state/context-window";
import { formatContextWindowTokens } from "../../lib/contextWindow";
// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
import { cacheHitPercent, summarizeSessionUsage } from "../../lib/sessionUsage";
// # DPALUCH - changes END [session-cost-cache]
import { cn } from "../../lib/utils";
// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
import { serverEnvironment } from "../../state/server";
// # DPALUCH - changes END [session-cost-cache]
import { formatUpcomingTimestamp } from "../../timestampFormat";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { formatContextWindowCompactionMessage } from "./compaction.logic";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import { nextPoolReset, poolSources, resolveThreadDetailsLimits } from "./ThreadDetailsUsage.logic";

const PACE_LABEL: Record<LimitPace, string> = {
  ahead: msg("Ahead of pace"),
  on: msg("On pace"),
  under: msg("Under pace"),
};

export interface ThreadDetailsUsageInput {
  readonly providerInstanceId: ProviderInstanceId | null;
  readonly model: string | null;
  readonly providers: readonly ServerProvider[];
  readonly sources: UsageLimitSourceSnapshots;
  readonly contextWindow: ContextWindowSnapshot | null;
}

type UsageTone = "error" | "warning" | null;

function limitTone(left: number): UsageTone {
  if (left <= 10) return "error";
  if (left <= 20) return "warning";
  return null;
}

/** The selected provider's limit windows. Each row reads as room left and opens the usage page. */
export function ThreadDetailsUsage({
  providerInstanceId,
  model,
  providers,
  sources,
}: Omit<ThreadDetailsUsageInput, "contextWindow">) {
  const gt = useGT();
  const nowMinute = useNowMinute();
  const now = Date.parse(`${nowMinute}:00Z`);
  const resolved = resolveThreadDetailsLimits(providerInstanceId, model, providers, sources, now);
  if (!resolved) return null;

  return (
    <ThreadDetailsSection
      headingId="thread-details-usage-heading"
      title={gt("Usage limits")}
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        {resolved.kind === "pool" ? (
          resolved.windows.map((window) => <PoolRow key={window.id} window={window} now={now} />)
        ) : (
          <InstanceRows limits={resolved.limits} now={now} />
        )}
      </div>
    </ThreadDetailsSection>
  );
}

function InstanceRows({
  limits,
  now,
}: {
  readonly limits: ServerProviderUsageLimits;
  readonly now: number;
}) {
  const gt = useGT();
  const m = useMessages();
  const notice = limitsNotice(limits, m);
  if (notice) {
    return (
      <UsageRow
        label={gt("Limits", { $context: "usage limits row label" })}
        fill={null}
        tone={null}
        value={gt("Unavailable")}
        tooltip={<span className="text-foreground">{notice}</span>}
        opensUsage
      />
    );
  }
  return limits.windows.map((window) => <LimitRow key={window.id} window={window} now={now} />);
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
  const gt = useGT();
  const m = useMessages();
  const locale = useLocale();
  const usedTokens = formatContextWindowTokens(usage.usedTokens);
  return (
    <ThreadDetailsSection
      headingId="thread-details-context-heading"
      title={gt("Context window")}
      showHeading={false}
    >
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
        <UsageRow
          label={gt("Context", { $context: "context window row label" })}
          fill={used}
          tone={used === null ? null : used >= 90 ? "error" : used >= 80 ? "warning" : null}
          tick={tick}
          muted
          value={
            maxTokens !== null
              ? `${usedTokens} / ${formatContextWindowTokens(maxTokens)}`
              : usedTokens
          }
          ariaValue={
            used !== null
              ? gt("{used}% used", { used })
              : gt("{usedTokens} tokens used", { usedTokens })
          }
          tooltip={
            <>
              <span className="text-foreground">
                {used !== null
                  ? gt("Context: {used}% used", { used })
                  : gt("Context: {usedTokens} tokens used", { usedTokens })}
              </span>
              {maxTokens !== null ? (
                <span className="text-muted-foreground">
                  {gt("{used} of {max} tokens", {
                    used: usage.usedTokens.toLocaleString(locale),
                    max: maxTokens.toLocaleString(locale),
                  })}
                </span>
              ) : null}
              {threshold !== null && threshold > 0 ? (
                <span className="text-muted-foreground">
                  {formatContextWindowCompactionMessage(threshold, m)}
                </span>
              ) : null}
            </>
          }
        />
      </div>
    </ThreadDetailsSection>
  );
}

// # DPALUCH - changes BEGIN [session-cost-cache]: Show session cost, prompt cache and reset times in the thread details card.
export interface ThreadDetailsSessionInput {
  readonly environmentId: EnvironmentId;
  readonly providerTurns: ReadonlyArray<Pick<OrchestrationV2ProviderTurn, "turnTokenUsage">>;
  /** Prices turns that do not report their model. */
  readonly fallbackModel: string;
  readonly liveUsage: OrchestrationV2ProviderTurnTokenUsage | null;
}

// # DPALUCH - changes BEGIN [nightly-20261118]: Adapt session copy to upstream translation checks.
/* oxlint-disable t3code/no-low-value-comments */
// /** Session cost and prompt cache of the thread, like a terminal status line. */
// export function ThreadDetailsSession({
//   environmentId,
//   providerTurns,
//   fallbackModel,
//   liveUsage,
// }: ThreadDetailsSessionInput) {
//   const nowMinute = useNowMinute();
//   const now = Date.parse(`${nowMinute}:00Z`);
//   const usage = summarizeSessionUsage(providerTurns, fallbackModel);
//   if (usage.priceItems.length === 0 && usage.inputTokens === 0) return null;
//
//   const hit = cacheHitPercent(usage);
//   const expiresAt = cacheExpiresAt(liveUsage);
//   const minutesLeft = expiresAt === null ? null : Math.ceil((expiresAt - now) / 60_000);
//   const warm = minutesLeft !== null && minutesLeft > 0;
//   // A cold cache makes the next message write the whole context to the cache again.
//   const rewrite = liveUsage ? formatTokens(liveUsage.usedTokens) : null;
//   const expiry =
//     minutesLeft === null
//       ? ""
//       : warm
//         ? ` · ${minutesLeft}m`
//         : ` · cold${rewrite ? ` ${rewrite}` : ""}`;
//
//   return (
//     <ThreadDetailsSection
//       headingId="thread-details-session-heading"
//       title="Session"
//       showHeading={false}
//     >
//       <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] gap-x-3 text-xs">
//         {usage.priceItems.length > 0 ? (
//           <SessionCostRow
//             environmentId={environmentId}
//             items={usage.priceItems}
//             unpricedTurnCount={usage.unpricedTurnCount}
//           />
//         ) : null}
//         <UsageRow
//           label="Cache"
//           fill={hit}
//           tone={null}
//           muted
//           value={`${hit ?? 0}%${expiry}`}
//           ariaValue={`${hit ?? 0}% of input read from cache`}
//           tooltip={
//             <>
//               <span className="text-foreground">Cache: {hit ?? 0}% of input read from cache</span>
//               <span className="text-muted-foreground">
//                 Read {formatTokens(usage.cacheReadTokens)} · written{" "}
//                 {formatTokens(usage.cacheWriteTokens)} · input {formatTokens(usage.inputTokens)}
//               </span>
//               {minutesLeft !== null ? (
//                 <span className="text-muted-foreground">
//                   {warm
//                     ? `Expires in about ${minutesLeft}m if the thread stays idle`
//                     : `Expired: the next message writes ${rewrite ?? "the context"} to the cache again`}
//                 </span>
//               ) : null}
//             </>
//           }
//         />
//       </div>
//     </ThreadDetailsSection>
//   );
// }
//
// /** The provider's expiry time, or the last update plus the cache lifetime. Null when unknown. */
// function cacheExpiresAt(liveUsage: OrchestrationV2ProviderTurnTokenUsage | null): number | null {
//   if (liveUsage === null) return null;
//   const reported = liveUsage.promptCacheExpiresAt
//     ? Date.parse(liveUsage.promptCacheExpiresAt)
//     : NaN;
//   if (Number.isFinite(reported)) return reported;
//   const updatedAt = Date.parse(liveUsage.updatedAt);
//   return liveUsage.promptCacheTtlMs !== undefined && Number.isFinite(updatedAt)
//     ? updatedAt + liveUsage.promptCacheTtlMs
//     : null;
// }
//
// function SessionCostRow({
//   environmentId,
//   items,
//   unpricedTurnCount,
// }: {
//   readonly environmentId: EnvironmentId;
//   readonly items: readonly UsagePriceItemInput[];
//   readonly unpricedTurnCount: number;
// }) {
//   const result = useAtomValue(serverEnvironment.priceUsage({ environmentId, input: { items } }));
//   // Servers without server.priceUsage (for example the official nightly) answer with an error.
//   if (result._tag === "Failure") {
//     return (
//       <UsageRow
//         label="Cost"
//         fill={null}
//         tone={null}
//         value="Unavailable"
//         tooltip={<span className="text-foreground">This server cannot price usage</span>}
//       />
//     );
//   }
//   const priced = AsyncResult.getOrElse(result, () => null);
//   if (priced === null) {
//     return <UsageRow label="Cost" fill={null} tone={null} value="…" tooltip="Pricing usage" />;
//   }
//
//   const total = priced.items.reduce((sum, item) => sum + item.costUsd, 0);
//   const unpricedModels = priced.items.filter((item) => item.costSource === "unpriced");
//   const partial = unpricedModels.length > 0 || unpricedTurnCount > 0;
//   const allUnpriced = unpricedModels.length === priced.items.length;
//   return (
//     <UsageRow
//       label="Cost"
//       fill={null}
//       tone={null}
//       value={allUnpriced ? "Unpriced" : `${formatUsd(total)}${partial ? "+" : ""} est.`}
//       ariaValue={allUnpriced ? "Unpriced" : `about ${formatUsd(total)} at API prices`}
//       tooltip={
//         <>
//           <span className="text-foreground">
//             API price of this thread: about {formatUsd(total)}
//           </span>
//           <span className="text-muted-foreground">
//             Main agent only, priced with the Usage rates
//           </span>
//           {priced.items.map((item) => (
//             <span key={item.id} className="text-muted-foreground">
//               {item.id}: {item.costSource === "unpriced" ? "no price" : formatUsd(item.costUsd)}
//             </span>
//           ))}
//           {unpricedTurnCount > 0 ? (
//             <span className="text-muted-foreground">
//               {unpricedTurnCount} turn(s) with several or unknown models are not included
//             </span>
//           ) : null}
//         </>
//       }
//     />
//   );
// }
/* oxlint-enable t3code/no-low-value-comments */
/** Session cost and prompt cache of the thread, like a terminal status line. */
export function ThreadDetailsSession({
  environmentId,
  providerTurns,
  fallbackModel,
  liveUsage,
}: ThreadDetailsSessionInput) {
  const gt = useGT();
  const nowMinute = useNowMinute();
  const now = Date.parse(`${nowMinute}:00Z`);
  const usage = summarizeSessionUsage(providerTurns, fallbackModel);
  if (usage.priceItems.length === 0 && usage.inputTokens === 0) return null;

  const hit = cacheHitPercent(usage);
  const expiresAt = cacheExpiresAt(liveUsage);
  const minutesLeft = expiresAt === null ? null : Math.ceil((expiresAt - now) / 60_000);
  const warm = minutesLeft !== null && minutesLeft > 0;
  // A cold cache makes the next message write the whole context to the cache again.
  const rewrite = liveUsage ? formatTokens(liveUsage.usedTokens) : null;
  const expiry =
    minutesLeft === null
      ? ""
      : warm
        ? ` · ${minutesLeft}m`
        : ` · cold${rewrite ? ` ${rewrite}` : ""}`;

  return (
    <ThreadDetailsSection
      headingId="thread-details-session-heading"
      title={gt("Session")}
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
          label={gt("Cache")}
          fill={hit}
          tone={null}
          muted
          value={`${hit ?? 0}%${expiry}`}
          ariaValue={gt("{hit}% of input read from cache", { hit: hit ?? 0 })}
          tooltip={
            <>
              <span className="text-foreground">
                {gt("Cache: {hit}% of input read from cache", { hit: hit ?? 0 })}
              </span>
              <span className="text-muted-foreground">
                {gt("Read {read} · written {written} · input {input}", {
                  read: formatTokens(usage.cacheReadTokens),
                  written: formatTokens(usage.cacheWriteTokens),
                  input: formatTokens(usage.inputTokens),
                })}
              </span>
              {minutesLeft !== null ? (
                <span className="text-muted-foreground">
                  {warm
                    ? gt(
                        "Expires in about {count, plural, one {{count} minute} other {{count} minutes}} if the thread stays idle",
                        { count: minutesLeft },
                      )
                    : rewrite
                      ? gt("Expired: the next message writes {tokens} to the cache again", {
                          tokens: rewrite,
                        })
                      : gt("Expired: the next message writes the context to the cache again")}
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
  const gt = useGT();
  const result = useAtomValue(serverEnvironment.priceUsage({ environmentId, input: { items } }));
  // Servers without server.priceUsage (for example the official nightly) answer with an error.
  if (result._tag === "Failure") {
    return (
      <UsageRow
        label={gt("Cost")}
        fill={null}
        tone={null}
        value={gt("Unavailable")}
        tooltip={<span className="text-foreground">{gt("This server cannot price usage")}</span>}
      />
    );
  }
  const priced = AsyncResult.getOrElse(result, () => null);
  if (priced === null) {
    return (
      <UsageRow
        label={gt("Cost")}
        fill={null}
        tone={null}
        value="…"
        tooltip={gt("Pricing usage")}
      />
    );
  }

  const total = priced.items.reduce((sum, item) => sum + item.costUsd, 0);
  const unpricedModels = priced.items.filter((item) => item.costSource === "unpriced");
  const partial = unpricedModels.length > 0 || unpricedTurnCount > 0;
  const allUnpriced = unpricedModels.length === priced.items.length;
  return (
    <UsageRow
      label={gt("Cost")}
      fill={null}
      tone={null}
      value={
        allUnpriced
          ? gt("Unpriced")
          : gt("{cost} est.", { cost: `${formatUsd(total)}${partial ? "+" : ""}` })
      }
      ariaValue={
        allUnpriced ? gt("Unpriced") : gt("about {cost} at API prices", { cost: formatUsd(total) })
      }
      tooltip={
        <>
          <span className="text-foreground">
            {gt("API price of this thread: about {cost}", { cost: formatUsd(total) })}
          </span>
          <span className="text-muted-foreground">
            {gt("Main agent only, priced with the Usage rates")}
          </span>
          {priced.items.map((item) => (
            <span key={item.id} className="text-muted-foreground">
              {item.id}: {item.costSource === "unpriced" ? gt("no price") : formatUsd(item.costUsd)}
            </span>
          ))}
          {unpricedTurnCount > 0 ? (
            <span className="text-muted-foreground">
              {gt(
                "{count, plural, one {{count} turn with several or unknown models is not included} other {{count} turns with several or unknown models are not included}}",
                { count: unpricedTurnCount },
              )}
            </span>
          ) : null}
        </>
      }
    />
  );
}
// # DPALUCH - changes END [nightly-20261118]
// # DPALUCH - changes END [session-cost-cache]

function LimitRow({
  window,
  now,
}: {
  readonly window: ServerProviderUsageWindow;
  readonly now: number;
}) {
  const gt = useGT();
  const m = useMessages();
  const timestampFormat = usePrimarySettings((settings) => settings.timestampFormat);
  const left = remainingPercent(window);
  const pace = paceOf(window, now);
  const timeLeft = paceRemainingPercent(window, now);
  const resetsAt = window.resetsAt ? Date.parse(window.resetsAt) : Number.NaN;
  return (
    <UsageRow
      label={window.label}
      fill={left}
      tone={limitTone(left)}
      tick={timeLeft}
      // # DPALUCH - changes BEGIN [nightly-20261120]: Use upstream's time marker without a second reset countdown.
      // value={`${left}%${resetsIn}`}
      value={`${left}%`}
      // # DPALUCH - changes END [nightly-20261120]
      ariaValue={gt("{left}% left", { left })}
      opensUsage
      tooltip={
        <>
          <span className="text-foreground">
            {gt("{label}: {left}% left", { label: window.label, left })}
          </span>
          {pace && timeLeft !== null ? (
            <span className="text-muted-foreground">
              {m(PACE_LABEL[pace])} · {gt("{timeLeft}% of the window left", { timeLeft })}
            </span>
          ) : null}
          {window.resetsAt && resetsAt > now ? (
            <span className="text-muted-foreground">
              {gt("Resets in {duration} · {time}", {
                duration: formatDuration(resetsAt - now, m),
                time: formatUpcomingTimestamp(window.resetsAt, timestampFormat, now, undefined, m),
              })}
            </span>
          ) : null}
        </>
      }
    />
  );
}

function PoolRow({ window, now }: { readonly window: LimitPoolWindow; readonly now: number }) {
  const gt = useGT();
  const m = useMessages();
  const timestampFormat = usePrimarySettings((settings) => settings.timestampFormat);
  const left = window.remainingPercent;
  const accounts = window.members.length;
  const from = poolSources(window);
  const sourceLabels = [...from.hubs, ...(from.signedIn ? [gt("Signed-in accounts")] : [])];
  const next = nextPoolReset(window, now);
  const resetsAt = next?.member.window.resetsAt;
  const reset =
    next && resetsAt
      ? {
          duration: formatDuration(next.at - now, m),
          time: formatUpcomingTimestamp(resetsAt, timestampFormat, now, undefined, m),
        }
      : null;
  return (
    <UsageRow
      label={window.label}
      fill={left}
      tone={limitTone(left)}
      value={`${left}%`}
      ariaValue={gt("{left}% left", { left })}
      opensUsage
      tooltip={
        <>
          <span className="text-foreground">
            {accounts > 1
              ? gt("{label}: {left}% left across {accounts} accounts", {
                  label: window.label,
                  left,
                  accounts,
                })
              : gt("{label}: {left}% left", { label: window.label, left })}
          </span>
          {window.pace ? (
            <span className="text-muted-foreground">{m(PACE_LABEL[window.pace])}</span>
          ) : null}
          {next && reset ? (
            <span className="text-muted-foreground">
              {accounts > 1
                ? gt("+{percent}% in {duration} · {time}", {
                    percent: next.restoresPercent,
                    ...reset,
                  })
                : gt("Resets in {duration} · {time}", reset)}
            </span>
          ) : null}
          {sourceLabels.length > 0 ? (
            <span className="text-muted-foreground">
              {gt("From {sources}", { sources: sourceLabels.join(", ") })}
            </span>
          ) : null}
        </>
      }
    />
  );
}

/** One label, hairline, and value row; the whole row opens the details tooltip. With `opensUsage` it links to the usage page. */
function UsageRow({
  label,
  fill,
  tone,
  tick = null,
  value,
  ariaValue = value,
  tooltip,
  muted = false,
  opensUsage = false,
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
  readonly opensUsage?: boolean;
}) {
  const gt = useGT();
  const rowProps = {
    "aria-label": gt("{label}: {value}", { label, value: ariaValue }),
    className: cn(
      "col-span-3 grid h-6 grid-cols-subgrid items-center rounded-lg px-2.5 outline-none hover:bg-black/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:bg-black/[0.035] dark:hover:bg-white/[0.08] dark:data-popup-open:bg-white/[0.08]",
      opensUsage
        ? "group cursor-pointer active:bg-black/[0.06] dark:active:bg-white/[0.12]"
        : "cursor-default",
    ),
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          opensUsage ? <Link to="/usage" {...rowProps} /> : <div tabIndex={0} {...rowProps} />
        }
      >
        <span className="max-w-28 truncate text-muted-foreground group-hover:text-foreground">
          {label}
        </span>
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
                className="absolute -top-[3px] h-[9px] w-px -translate-x-1/2 bg-foreground/75"
                style={{ left: `clamp(0.5px, ${tick}%, calc(100% - 0.5px))` }}
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
        <div className="flex flex-col gap-0.5">
          {tooltip}
          {opensUsage ? <span className="text-muted-foreground">{gt("Open usage")}</span> : null}
        </div>
      </TooltipPopup>
    </Tooltip>
  );
}
