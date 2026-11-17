import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { readUsagePagePreferences, saveUsagePagePreferences } from "./usagePagePreferences";

const key = "t3code:usage-page-preferences:v1";
let values: Map<string, string>;
let storage: Pick<Storage, "getItem" | "setItem">;

beforeEach(() => {
  values = new Map();
  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Usage page preferences", () => {
  // # DPALUCH - changes BEGIN [account-usage]: Split Usage cost and tokens by provider account.
  /* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
  // it("round-trips hidden providers and reads older saves without them", () => {
  //   saveUsagePagePreferences({ metric: "cost", windowDays: 7, hiddenProviders: ["codex"] });
  //   expect(readUsagePagePreferences().hiddenProviders).toEqual(["codex"]);
  //
  //   values.set(key, '{"metric":"tokens","windowDays":30}');
  //   expect(readUsagePagePreferences()).toEqual({ metric: "tokens", windowDays: 30 });
  // });
  /* oxlint-enable t3code/no-low-value-comments */
  it("round-trips hidden providers and accounts and reads older saves without them", () => {
    saveUsagePagePreferences({
      metric: "cost",
      windowDays: 7,
      hiddenProviders: ["codex"],
      hiddenSources: ["mac claude /a/.claude 1:1"],
    });
    expect(readUsagePagePreferences()).toMatchObject({
      hiddenProviders: ["codex"],
      hiddenSources: ["mac claude /a/.claude 1:1"],
    });

    values.set(key, '{"metric":"tokens","windowDays":30}');
    expect(readUsagePagePreferences()).toEqual({ metric: "tokens", windowDays: 30 });
  });
  // # DPALUCH - changes END [account-usage]

  // regression: #10189 an invalid saved usage selection was never replaced
  it.each([
    "not-json",
    '{"metric":"unknown","windowDays":7}',
    '{"metric":"cost","windowDays":365}',
  ])("replaces invalid preferences on the next save: %s", (value) => {
    values.set(key, value);
    expect(readUsagePagePreferences()).toEqual({ metric: "limits", windowDays: 30 });
    saveUsagePagePreferences({ metric: "tokens", windowDays: 7 });
    expect(readUsagePagePreferences()).toEqual({ metric: "tokens", windowDays: 7 });
  });
});
