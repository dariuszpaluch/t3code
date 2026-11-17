import { describe, expect, it } from "vite-plus/test";
import { parseObsidianOpenUrl } from "./obsidianUri.ts";

describe("parseObsidianOpenUrl", () => {
  it.each([
    "obsidian://open?vault=Work%20Notes&file=Research%2FShared%20approaches",
    "obsidian://open?vault=ef6ca3e3b524d22f&file=Note%23Heading",
    "obsidian://open?path=%2FUsers%2Fdemo%2FNotes%2FNote.md",
    "obsidian://open?vault=Notes",
    "obsidian://open?vault=Notes&file=%C5%BB%C3%B3%C5%82w&paneType=tab",
  ])("preserves navigation parameters in %s", (href) => {
    expect(parseObsidianOpenUrl(href)).toBe(href);
  });

  it.each([
    "obsidian://new?vault=Notes&file=Note&overwrite=true",
    "obsidian://daily?vault=Notes&content=append",
    "obsidian://advanced-uri?vault=Notes&commandname=delete",
    "obsidian://search?vault=Notes&query=test",
    "obsidian://open/plugin-command?vault=Notes",
    "obsidian://open:123?vault=Notes",
    "obsidian://user@open?vault=Notes",
    "obsidian://user:password@open?vault=Notes",
    "obsidian://open.example.com?vault=Notes",
    "obsidian://open?vault=Notes&content=replace",
    "obsidian://open?vault=Notes&append=true",
    "obsidian://open?vault=Notes&overwrite=true",
    "obsidian://open?vault=Notes&x-success=https%3A%2F%2Fexample.com",
    "obsidian://open?vault=Notes&file=Note#unencoded-heading",
    "javascript:alert(1)",
    "https://example.com/?target=obsidian://open",
    "file:///tmp/note.md",
    "not a URL",
  ])("rejects commands and non-navigation URLs: %s", (href) => {
    expect(parseObsidianOpenUrl(href)).toBeNull();
  });
});
