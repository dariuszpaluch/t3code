import type {
  EnvironmentId,
  ProviderInstanceId,
  ServerProvider,
  UsageProviderKind,
  UsageSummary,
} from "@t3tools/contracts";
import { usageSourceKey } from "@t3tools/shared/usageMerge";

import { resolveProviderInstanceDisplayName } from "./providerInstanceDisplay.ts";

/** One history source of a provider. Usually one provider instance's home directory. */
export interface UsageAccount {
  readonly key: string;
  readonly provider: UsageProviderKind;
  readonly environmentId: EnvironmentId;
  readonly resolvedHomePath: string;
  readonly providerInstanceIds: readonly ProviderInstanceId[];
}

type InstanceSnapshot = Pick<ServerProvider, "instanceId" | "driver" | "displayName">;

/**
 * Lists each provider's accounts in the given environments, in the order the
 * servers report them. A source seen in several environments is listed once.
 */
export function listUsageAccounts(
  environments: readonly {
    readonly environmentId: EnvironmentId;
    readonly summary: UsageSummary | null;
  }[],
): ReadonlyMap<UsageProviderKind, readonly UsageAccount[]> {
  const seen = new Set<string>();
  const accounts = new Map<UsageProviderKind, UsageAccount[]>();
  for (const { environmentId, summary } of environments) {
    for (const source of summary?.sources ?? []) {
      const key = usageSourceKey(source);
      if (source.status === "missing" || seen.has(key)) continue;
      seen.add(key);
      const { provider, resolvedHomePath } = source.fingerprint;
      const list = accounts.get(provider) ?? [];
      list.push({
        key,
        provider,
        environmentId,
        resolvedHomePath,
        providerInstanceIds: source.providerInstanceIds ?? [],
      });
      accounts.set(provider, list);
    }
  }
  return accounts;
}

/**
 * Names each account after its provider instances, or its home path when the
 * server does not report them. When the accounts come from several
 * environments, each name ends with its environment.
 */
export function usageAccountLabels(
  accounts: readonly Omit<UsageAccount, "provider">[],
  instancesByEnvironment: ReadonlyMap<EnvironmentId, readonly InstanceSnapshot[]>,
  environmentLabels: ReadonlyMap<EnvironmentId, string>,
): ReadonlyMap<string, string> {
  const spansEnvironments = new Set(accounts.map((account) => account.environmentId)).size > 1;
  return new Map(
    accounts.map((account) => {
      const instances = instancesByEnvironment.get(account.environmentId) ?? [];
      const names = account.providerInstanceIds.map((instanceId) => {
        const instance = instances.find((candidate) => candidate.instanceId === instanceId);
        return instance === undefined ? instanceId : resolveProviderInstanceDisplayName(instance);
      });
      const name = names.length > 0 ? names.join(", ") : account.resolvedHomePath;
      const environment = environmentLabels.get(account.environmentId);
      return [
        account.key,
        spansEnvironments && environment !== undefined ? `${name} · ${environment}` : name,
      ];
    }),
  );
}
