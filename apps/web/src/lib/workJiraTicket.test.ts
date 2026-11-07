import { describe, expect, it } from "vite-plus/test";

import { isInsideFolder, jiraKeyOf, workJiraTicket } from "./workJiraTicket";

describe("jiraKeyOf", () => {
  it("reads the key at the start or after a prefix", () => {
    expect(jiraKeyOf("GAMG-337-fix-login")).toBe("GAMG-337");
    expect(jiraKeyOf("feature/UCP2-12")).toBe("UCP2-12");
  });

  it("ignores branches without a key", () => {
    expect(jiraKeyOf("main")).toBeNull();
    expect(jiraKeyOf("feature/fix-GAMG-337")).toBeNull();
    expect(jiraKeyOf("gamg-337-lowercase")).toBeNull();
  });
});

describe("isInsideFolder", () => {
  it("matches the folder and paths inside it", () => {
    expect(isInsideFolder("/Users/me/Work", "/Users/me/Work/")).toBe(true);
    expect(isInsideFolder("/Users/me/Work/repo", "/Users/me/Work")).toBe(true);
  });

  it("does not match a sibling with the same prefix or an empty folder", () => {
    expect(isInsideFolder("/Users/me/Workshop/repo", "/Users/me/Work")).toBe(false);
    expect(isInsideFolder("/Users/me/Work/repo", "")).toBe(false);
  });
});

describe("workJiraTicket", () => {
  const base = {
    cwd: "/Users/me/Work/pandora",
    workFolder: "/Users/me/Work",
    browseUrl: "https://example.atlassian.net/jira/browse/",
  };

  it("links the key of a work branch", () => {
    expect(workJiraTicket({ ...base, branch: "feature/GAMG-337-x" })).toEqual({
      key: "GAMG-337",
      url: "https://example.atlassian.net/jira/browse/GAMG-337",
    });
  });

  it("is null outside the work folder, without a key or without config", () => {
    expect(
      workJiraTicket({ ...base, branch: "GAMG-1", cwd: "/Users/me/Programming/x" }),
    ).toBeNull();
    expect(workJiraTicket({ ...base, branch: "main" })).toBeNull();
    expect(workJiraTicket({ ...base, branch: null })).toBeNull();
    expect(workJiraTicket({ ...base, branch: "GAMG-1", browseUrl: "" })).toBeNull();
    expect(workJiraTicket({ ...base, branch: "GAMG-1", workFolder: "" })).toBeNull();
  });
});
