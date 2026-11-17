import { useAtomValue } from "@effect/atom-react";
import {
  AuthDiagnosticsReadScope,
  USAGE_CONTRACT_VERSION,
  type EnvironmentId,
  type UsageBucket,
  type UsageSummary,
  type UsageProviderKind,
  type UsageSummaryInput,
} from "@t3tools/contracts";
import { refreshUsage, usageSummaryInput } from "@t3tools/client-runtime/state/usage";
import { resolveUsageAccess } from "@t3tools/client-runtime/state/usage-access";
import { AsyncResult, Atom } from "effect/reactivity";
import { useState } from "react";

// # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
/* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
// import { mergeUsage, type EnvironmentUsage, type MergedUsage } from "@t3tools/shared/usageMerge";
/* oxlint-enable t3code/no-low-value-comments */
import {
  mergeUsage,
  withoutUsageSources,
  type EnvironmentUsage,
  type MergedUsage,
} from "@t3tools/shared/usageMerge";
// # DPALUCH - changes END [account-usage]
import { appAtomRegistry } from "../rpc/atomRegistry";
import { environmentPresentations } from "./presentation";
import { serverEnvironment } from "./server";
import { environmentSession, readEnvironmentScope } from "./session";

export interface EnvironmentUsageStatus {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly isPending: boolean;
  readonly canReadDiagnostics: boolean;
  readonly isConnected: boolean;
  readonly error: string | null;
  readonly summary: UsageSummary | null;
}

const usageByWindowAtom = Atom.family((windowKey: string) =>
  Atom.make((get): readonly EnvironmentUsageStatus[] => {
    const input = JSON.parse(windowKey) as UsageSummaryInput;
    const presentations = get(environmentPresentations.presentationsAtom);

    const statuses: EnvironmentUsageStatus[] = [];
    for (const [environmentId, presentation] of presentations) {
      const isConnected = presentation.connection.phase === "connected";
      const sessionResult = get(environmentSession.sessionStateAtom(environmentId));
      const access = resolveUsageAccess({
        connectionPhase: presentation.connection.phase,
        session: AsyncResult.getOrElse(sessionResult, () => null),
        hasSessionError: sessionResult._tag === "Failure",
      });
      if (!access.canReadDiagnostics) {
        statuses.push({
          environmentId,
          label: presentation.entry.target.label,
          isConnected,
          ...access,
          summary: null,
        });
        continue;
      }
      const result = get(
        serverEnvironment.usageSummary({
          environmentId,
          input: usageSummaryInput(
            input,
            get(serverEnvironment.usageModelFilterAtom(environmentId)),
          ),
        }),
      );
      const summary = AsyncResult.getOrElse(result, () => null);
      statuses.push({
        environmentId,
        label: presentation.entry.target.label,
        isPending: result.waiting,
        canReadDiagnostics: true,
        isConnected,
        error: result._tag === "Failure" ? "This environment could not report usage." : null,
        summary,
      });
    }
    return statuses;
  }).pipe(Atom.withLabel(`web-usage:window:${windowKey}`)),
);

export interface UsageView {
  readonly merged: MergedUsage;
  readonly environments: readonly EnvironmentUsageStatus[];
  readonly selectedEnvironments: readonly EnvironmentUsageStatus[];
  readonly isPending: boolean;
  readonly shown: { readonly window: UsageSummaryInput; readonly merged: MergedUsage } | null;
  readonly isPartial: boolean;
  readonly refresh: (input?: UsageSummaryInput) => Promise<void>;
}

export function mergeAnsweredUsage(
  environments: readonly EnvironmentUsageStatus[],
  keepBucket?: (bucket: UsageBucket) => boolean,
): MergedUsage {
  const answered: EnvironmentUsage[] = environments.flatMap(({ environmentId, label, summary }) =>
    summary === null
      ? []
      : [
          {
            environmentId,
            label,
            summary:
              keepBucket === undefined
                ? summary
                : { ...summary, buckets: summary.buckets.filter(keepBucket) },
          },
        ],
  );
  return mergeUsage(answered, USAGE_CONTRACT_VERSION);
}

const NO_HIDDEN_PROVIDERS: ReadonlySet<UsageProviderKind> = new Set();
// # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
const NO_HIDDEN_SOURCES: ReadonlySet<string> = new Set();
// # DPALUCH - changes END [account-usage]

// # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
/* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
// function withoutProviders(
//   environments: readonly EnvironmentUsageStatus[],
//   hiddenProviders: ReadonlySet<UsageProviderKind>,
// ): readonly EnvironmentUsageStatus[] {
//   if (hiddenProviders.size === 0) return environments;
//   return environments.map((environment) =>
//     environment.summary === null
//       ? environment
//       : {
//           ...environment,
//           summary: {
//             ...environment.summary,
//             buckets: environment.summary.buckets.filter(
//               (bucket) => !hiddenProviders.has(bucket.provider),
//             ),
//             sources: environment.summary.sources.filter(
//               (source) => !hiddenProviders.has(source.fingerprint.provider),
//             ),
//           },
//         },
//   );
// }
/* oxlint-enable t3code/no-low-value-comments */
function withoutHidden(
  environments: readonly EnvironmentUsageStatus[],
  hiddenProviders: ReadonlySet<UsageProviderKind>,
  hiddenSources: ReadonlySet<string>,
): readonly EnvironmentUsageStatus[] {
  if (hiddenProviders.size === 0 && hiddenSources.size === 0) return environments;
  return environments.map((environment) =>
    environment.summary === null
      ? environment
      : {
          ...environment,
          summary: withoutUsageSources(
            {
              ...environment.summary,
              buckets: environment.summary.buckets.filter(
                (bucket) => !hiddenProviders.has(bucket.provider),
              ),
              sources: environment.summary.sources.filter(
                (source) => !hiddenProviders.has(source.fingerprint.provider),
              ),
            },
            hiddenSources,
          ),
        },
  );
}
// # DPALUCH - changes END [account-usage]

// # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
/* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
// function deriveSelection(
//   environments: readonly EnvironmentUsageStatus[],
//   selectedEnvironmentIds: ReadonlySet<EnvironmentId> | null,
//   hiddenProviders: ReadonlySet<UsageProviderKind>,
// ) {
//   const selectedEnvironments =
//     selectedEnvironmentIds === null
//       ? environments
//       : environments.filter((environment) => selectedEnvironmentIds.has(environment.environmentId));
//   return {
//     environments,
//     selectedEnvironmentIds,
//     hiddenProviders,
//     selectedEnvironments,
//     merged: mergeAnsweredUsage(withoutProviders(selectedEnvironments, hiddenProviders)),
//   };
// }
/* oxlint-enable t3code/no-low-value-comments */
function deriveSelection(
  environments: readonly EnvironmentUsageStatus[],
  selectedEnvironmentIds: ReadonlySet<EnvironmentId> | null,
  hiddenProviders: ReadonlySet<UsageProviderKind>,
  hiddenSources: ReadonlySet<string>,
) {
  const selectedEnvironments =
    selectedEnvironmentIds === null
      ? environments
      : environments.filter((environment) => selectedEnvironmentIds.has(environment.environmentId));
  return {
    environments,
    selectedEnvironmentIds,
    hiddenProviders,
    hiddenSources,
    selectedEnvironments,
    merged: mergeAnsweredUsage(withoutHidden(selectedEnvironments, hiddenProviders, hiddenSources)),
  };
}
// # DPALUCH - changes END [account-usage]

export function useUsage(
  input: UsageSummaryInput,
  selectedEnvironmentIds: ReadonlySet<EnvironmentId> | null = null,
  hiddenProviders: ReadonlySet<UsageProviderKind> = NO_HIDDEN_PROVIDERS,
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
  hiddenSources: ReadonlySet<string> = NO_HIDDEN_SOURCES,
  // # DPALUCH - changes END [account-usage]
): UsageView {
  const windowKey = JSON.stringify({
    sinceDay: input.sinceDay,
    untilDay: input.untilDay,
    timeZone: input.timeZone,
    resolution: input.resolution,
    sinceTime: input.sinceTime,
    untilTime: input.untilTime,
  });
  const atom = usageByWindowAtom(windowKey);
  const environments = useAtomValue(atom);
  // Identity-based render sync needs a derivation retained by inputs across renders.
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.

  // const [derived, setDerived] = useState(() =>
  //   deriveSelection(environments, selectedEnvironmentIds, hiddenProviders),
  // );
  const [derived, setDerived] = useState(() =>
    deriveSelection(environments, selectedEnvironmentIds, hiddenProviders, hiddenSources),
  );
  // # DPALUCH - changes END [account-usage]
  let current = derived;
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
  /* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
  // if (
  //   derived.environments !== environments ||
  //   derived.selectedEnvironmentIds !== selectedEnvironmentIds ||
  //   derived.hiddenProviders !== hiddenProviders
  // ) {
  //   current = deriveSelection(environments, selectedEnvironmentIds, hiddenProviders);
  //   setDerived(current);
  // }
  /* oxlint-enable t3code/no-low-value-comments */
  if (
    derived.environments !== environments ||
    derived.selectedEnvironmentIds !== selectedEnvironmentIds ||
    derived.hiddenProviders !== hiddenProviders ||
    derived.hiddenSources !== hiddenSources
  ) {
    current = deriveSelection(environments, selectedEnvironmentIds, hiddenProviders, hiddenSources);
    setDerived(current);
  }
  // # DPALUCH - changes END [account-usage]
  const { selectedEnvironments, merged } = current;

  const refresh = (nextInput?: UsageSummaryInput) =>
    refreshUsage({
      registry: appAtomRegistry,
      server: serverEnvironment,
      presentations: environmentPresentations,
      environmentIds: selectedEnvironments
        .filter(
          (environment) =>
            environment.canReadDiagnostics &&
            readEnvironmentScope(environment.environmentId, AuthDiagnosticsReadScope),
        )
        .map(({ environmentId }) => environmentId),
      input: nextInput ?? (JSON.parse(windowKey) as UsageSummaryInput),
    });

  const answeredCount = selectedEnvironments.filter(
    (environment) => environment.summary !== null,
  ).length;
  const stillReporting = selectedEnvironments.filter(
    (environment) => environment.summary === null && environment.error === null,
  ).length;
  const isPending = answeredCount === 0 && stillReporting > 0;

  const [lastAnswered, setLastAnswered] = useState<
    | (NonNullable<UsageView["shown"]> & {
        readonly selection: typeof selectedEnvironmentIds;
        readonly hidden: typeof hiddenProviders;
        // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
        readonly hiddenSources: typeof hiddenSources;
        // # DPALUCH - changes END [account-usage]
      })
    | null
  >(null);
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
  /* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
  // if (
  //   answeredCount > 0 &&
  //   (lastAnswered?.merged !== merged ||
  //     lastAnswered.window !== input ||
  //     lastAnswered.selection !== selectedEnvironmentIds ||
  //     lastAnswered.hidden !== hiddenProviders)
  // ) {
  //   setLastAnswered({
  //     window: input,
  //     merged,
  //     selection: selectedEnvironmentIds,
  //     hidden: hiddenProviders,
  //   });
  // }
  /* oxlint-enable t3code/no-low-value-comments */
  if (
    answeredCount > 0 &&
    (lastAnswered?.merged !== merged ||
      lastAnswered.window !== input ||
      lastAnswered.selection !== selectedEnvironmentIds ||
      lastAnswered.hidden !== hiddenProviders ||
      lastAnswered.hiddenSources !== hiddenSources)
  ) {
    setLastAnswered({
      window: input,
      merged,
      selection: selectedEnvironmentIds,
      hidden: hiddenProviders,
      hiddenSources,
    });
  }
  // # DPALUCH - changes END [account-usage]
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.

  // const kept =
  //   lastAnswered?.selection === selectedEnvironmentIds && lastAnswered.hidden === hiddenProviders
  //     ? lastAnswered
  //     : null;
  const kept =
    lastAnswered?.selection === selectedEnvironmentIds &&
    lastAnswered.hidden === hiddenProviders &&
    lastAnswered.hiddenSources === hiddenSources
      ? lastAnswered
      : null;
  // # DPALUCH - changes END [account-usage]
  const shown =
    answeredCount > 0
      ? { window: input, merged }
      : (kept ?? (isPending ? null : { window: input, merged }));

  return {
    merged,
    environments,
    selectedEnvironments,
    isPending,
    shown,
    isPartial: answeredCount > 0 && stillReporting > 0,
    refresh,
  };
}
