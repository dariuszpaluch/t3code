import { Linking } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { tryOpenExternalUrl } from "./openExternalUrl";

vi.mock("react-native", () => ({
  Linking: { openURL: vi.fn() },
}));

const openURL = vi.mocked(Linking.openURL);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tryOpenExternalUrl", () => {
  // # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
  it("opens Obsidian notes but never sends writing commands to the OS", async () => {
    openURL.mockResolvedValue(undefined);
    const href = "obsidian://open?vault=Notes&file=Research%2FShared%20approaches";
    await expect(tryOpenExternalUrl(href, "markdown-link")).resolves.toBe(true);
    for (const blocked of [
      "obsidian://new?vault=Notes&file=Note&content=replace",
      "  obsidian://new?vault=Notes&file=Note",
      "obsi\tdian://new?vault=Notes&file=Note",
      "obsidian://open?vault=Notes&file=Note&overwrite=true",
    ]) {
      await expect(tryOpenExternalUrl(blocked, "markdown-link")).resolves.toBe(false);
    }
    expect(openURL).toHaveBeenCalledExactlyOnceWith(href);
  });

  // # DPALUCH - changes END [obsidian-links]
  it("keeps provider sign-in URLs unchanged and out of failure logs", async () => {
    const url =
      "https://accounts.google.com/o/oauth2/v2/auth?state=private-state&code_challenge=private-challenge&redirect_uri=http%3A%2F%2F127.0.0.1%3A43123%2F";
    openURL.mockRejectedValue(new Error(`Cannot open ${url}`));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(tryOpenExternalUrl(url, "provider-auth")).resolves.toBe(false);

    expect(openURL).toHaveBeenCalledWith(url);
    const diagnostics = JSON.stringify(consoleError.mock.calls);
    expect(diagnostics).toContain("accounts.google.com");
    expect(diagnostics).not.toContain("private-state");
    expect(diagnostics).not.toContain("private-challenge");
    expect(diagnostics).not.toContain("43123");
  });
});
