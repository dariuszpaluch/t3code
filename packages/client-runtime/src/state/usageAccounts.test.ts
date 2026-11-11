import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  USAGE_CONTRACT_VERSION,
  UsageDay,
  type UsageSource,
  type UsageSummary,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { listUsageAccounts, usageAccountLabels } from "./usageAccounts.ts";

const LAPTOP = EnvironmentId.make("laptop");
const SERVER = EnvironmentId.make("server");

function source(
  homePath: string,
  instanceIds: readonly string[] | undefined,
  status: UsageSource["status"] = "ok",
): UsageSource {
  return {
    fingerprint: { hostId: "mac", provider: "claude", resolvedHomePath: homePath, volumeId: "1:1" },
    status,
    scannedFiles: 1,
    skippedFiles: 0,
    malformedRecords: 0,
    distinctSessions: 1,
    message: null,
    ...(instanceIds === undefined
      ? {}
      : { providerInstanceIds: instanceIds.map((id) => ProviderInstanceId.make(id)) }),
  };
}

function summary(sources: readonly UsageSource[]): UsageSummary {
  return {
    contractVersion: USAGE_CONTRACT_VERSION,
    readAt: "2026-09-05T12:00:00Z",
    timeZone: "UTC",
    sinceDay: UsageDay.make("2026-09-05"),
    untilDay: UsageDay.make("2026-09-05"),
    buckets: [],
    sources,
    pricing: { status: "fresh", source: "test", fetchedAt: null, knownModels: 1 },
    scanDurationMs: 1,
  };
}

const claude = ProviderDriverKind.make("claudeAgent");
const instances = new Map([
  [
    LAPTOP,
    [
      { instanceId: ProviderInstanceId.make("claudeAgent"), driver: claude, displayName: "Work" },
      {
        instanceId: ProviderInstanceId.make("claude-personal"),
        driver: claude,
        displayName: "Personal",
      },
    ],
  ],
]);

describe("usage accounts", () => {
  it("lists every source once and skips missing ones", () => {
    const shared = source("/a/.claude", ["claudeAgent"]);
    const accounts = listUsageAccounts([
      {
        environmentId: LAPTOP,
        summary: summary([shared, source("/a/.claude-gone", ["old"], "missing")]),
      },
      { environmentId: SERVER, summary: summary([shared]) },
      { environmentId: SERVER, summary: null },
    ]);

    expect(accounts.get("claude")?.map((account) => account.environmentId)).toEqual([LAPTOP]);
  });

  it("names accounts after their instances, falling back to the home path", () => {
    const accounts = listUsageAccounts([
      {
        environmentId: LAPTOP,
        summary: summary([
          source("/a/.claude", ["claudeAgent", "claude-personal"]),
          source("/a/.claude-legacy", undefined),
        ]),
      },
    ]).get("claude")!;

    expect([...usageAccountLabels(accounts, instances, new Map()).values()]).toEqual([
      "Work, Personal",
      "/a/.claude-legacy",
    ]);
  });

  it("adds the environment when accounts come from several environments", () => {
    const accounts = listUsageAccounts([
      { environmentId: LAPTOP, summary: summary([source("/a/.claude", ["claudeAgent"])]) },
      { environmentId: SERVER, summary: summary([source("/srv/.claude", ["claudeAgent"])]) },
    ]).get("claude")!;
    const labels = usageAccountLabels(
      accounts,
      instances,
      new Map([
        [LAPTOP, "Laptop"],
        [SERVER, "Server"],
      ]),
    );

    expect([...labels.values()]).toEqual(["Work · Laptop", "claudeAgent · Server"]);
  });
});
