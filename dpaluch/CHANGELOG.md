<!-- # DPALUCH - changes BEGIN [fork-traceability]: Record what changed in this fork and why. -->

# Dpaluch fork changelog

Record new fork-specific changes here. Use a stable change ID shared with the source comments. Keep entries newest first.

Historical changes before this policy are a separate backfill task. This file does not claim to contain their complete history.

## 2026-11-17

### fork-traceability

- **Area:** development workflow and source traceability.
- **Change:** start this changelog and require BEGIN/END markers for new fork changes. Keep replaced lines as inactive comments above their replacements.
- **Why:** find each local customization, its original code and its reason without reconstructing the whole git history.
- **Files:** `AGENTS.md`, `dpaluch/CHANGELOG.md`, and the marked blocks in this integration.
- **Scope:** prospective policy. Earlier pricing, account usage, Jira and sync modifications are deferred to the separate backfill task.
- **Validation:** all 13 source files retain the same parsed code after annotations. BEGIN/END pairs match in all 15 marked files. The package JSON remains valid.
- **Lint:** keep exceptions for `t3code/no-low-value-comments` limited to the three retained original blocks. Active code remains checked. Focused lint passes with one existing `oxc/no-this-in-exported-function` warning in `markdownPipeline.ts`.

### obsidian-emoji

- **Area:** web, desktop and mobile Markdown links.
- **Change:** show 📝 before Obsidian note links. Use the current native icon interface and keep the emoji's colors.
- **Why:** distinguish Obsidian links from ordinary web links and Markdown file links without changing their labels or destinations.
- **Files:** `apps/web/src/components/ChatMarkdown.tsx`, `apps/mobile/src/lib/markdownLinkIcons.ts`, `apps/mobile/src/native/useEnrichedLinkVariants.ts`, and `apps/mobile/assets/link-icons/obsidian.png`.
- **Related commit:** `f154752097`. This integration ports that change to the current nightly icon API.
- **Binary record:** `obsidian.png` is a new 64 x 64 transparent PNG. There is no previous asset. SHA-256: `e0d520b740720887145fee43550bc75fa0304141e38a637c027a433f551ee6f5`.

### obsidian-links

- **Area:** shared URI validation, desktop dispatch, web Markdown rendering and mobile links.
- **Change:** allow only `obsidian://open` navigation with the supported `vault`, `file`, `path` and `paneType` parameters. Continue blocking writing, plugin commands and image-source launches.
- **Why:** the existing URL filters removed Obsidian links or refused to dispatch them to the operating system.
- **Files:** `packages/shared/src/obsidianUri.ts`, its test, `packages/shared/src/markdownPipeline.ts`, `packages/shared/package.json`, `apps/desktop/src/electron/ElectronShell.ts`, `apps/web/src/components/ChatMarkdown.tsx`, `apps/mobile/src/lib/markdownLinks.ts`, `apps/mobile/src/lib/openExternalUrl.ts`, and their regression tests.
- **Related commit:** `2856cc0fb5`. This integration keeps newer upstream editor/app URL support and moves the web regression to the current browser test suite.
- **Integration base:** the existing fork at `c08963ac87`, based on upstream `v0.1.10-nightly.20261115.4723`. The running app is not rebuilt or restarted by this change.
- **Tests:** 67 focused unit tests and 34 real-browser Markdown tests pass on this nightly base. Shared, desktop and mobile typechecks pass.
- **Known baseline failure:** the web typecheck fails at `apps/web/src/components/chat/ThreadDetailsPanel.browser.test.tsx:145` because its props omit `session`. The same error occurs on unchanged `dpaluch-nightly` at `c08963ac87`. This integration does not modify that test or component.

#### JSON record

`packages/shared/package.json` adds the following export. Existing exports remain unchanged. JSON does not permit inline comments, so this entry is its change marker.

```json
"./obsidianUri": {
  "types": "./src/obsidianUri.ts",
  "import": "./src/obsidianUri.ts"
}
```

<!-- # DPALUCH - changes END [fork-traceability] -->
