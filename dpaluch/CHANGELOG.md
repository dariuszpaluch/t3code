<!-- # DPALUCH - changes BEGIN [fork-traceability]: Record what changed in this fork and why. -->

# Dpaluch fork changelog

Record new fork-specific changes here. Use a stable change ID shared with the source comments. Keep entries newest first.

<!-- Historical changes before this policy are a separate backfill task. This file does not claim to contain their complete history. -->

Changes before 2026-11-17 were marked later, in the `fork-backfill` entry. Upstream pull request code that this branch merges is not marked, except the copied `server.priceUsage` code.

## 2026-11-17

### fork-backfill

- **Area:** source traceability of the older fork changes.
- **Change:** add BEGIN/END markers to the fork changes made before 2026-11-17: `sync-script`, `price-usage`, `session-cost-cache`, `work-jira-link` and `account-usage`. Keep the upstream text of each replaced block as inactive comments above the active code. Add one changelog entry per change.
- **Why:** find the old customizations, their original code and their reasons the same way as the new ones.
- **Base:** upstream `v0.1.11-nightly.20261117.4838`. The markers describe the code at `c31e8cfa23`, not the original commits, because merges moved some blocks.
- **Not marked:** upstream code by other authors (`c8131c0e00`, `a103ed460b`, `64b56be583`, `748437fea4`, pull request 30730 machine filter), and blocks that already carry `obsidian-links`, `obsidian-emoji`, `nightly-20261117` or `fork-traceability`.
- **Files:** 30 source, script and doc files, with 100 marker pairs in total. The per-change entries below list them.
- **Placement:** most markers wrap whole statements or JSX elements. Where a change adds or replaces only an item inside an import list, an object, a destructuring pattern, a type or a JSX attribute list, the markers sit between the items. Two long replaced blocks wrap a whole function (`UsageProviderFilter`, `deriveSelection`).
- **Validation:** `git diff HEAD` removes no line in the 30 files. Every added line is a comment. TypeScript output without comments is identical to `HEAD` for 28 `.ts` and `.tsx` files, except blank JSX text around the three `{/* */}` markers. BEGIN/END pairs match per file and per change ID. Formatter check and focused lint pass with `--report-unused-disable-directives`. 21 web, 24 shared, 3 client-runtime and 70 server tests pass (server run with `TMPDIR=/private/tmp`). Shared, contracts, client-runtime and server typechecks pass. Web typecheck keeps the one existing error at `ThreadDetailsPanel.browser.test.tsx:145`. No push or history rewrite.
- **Lint:** only the retained original blocks of 3 lines or more carry `oxlint-disable t3code/no-low-value-comments` for that block. Active code stays checked.

### nightly-20261117

- **Area:** nightly integration and desktop build.
- **Change:** merge upstream `v0.1.11-nightly.20261117.4838` (`ea6d3fc30f`) into `dpaluch-nightly`, after rebuilding the local Obsidian changes at `9e7edb8f94`.
- **Why:** use the latest nightly while keeping Obsidian navigation, note emoji, machine filtering, Jira links and per-account usage.
- **Conflicts:** keep both Markdown imports; keep the provider-owner test alongside upstream Cursor retention tests; combine machine-scope reset with the new in-place route reveal argument; retain account rows under upstream paragraph markup.
- **Files:** `apps/web/src/components/ChatMarkdown.tsx`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/usage/UsagePage.tsx`, `apps/server/src/usage/UsageService.test.ts`. Other upstream files remain imported as upstream code. Conflict adaptations use `[nightly-20261117]` where the fork changes upstream behavior.
- **Build:** `v0.1.10-nightly.20261115.4723-dpaluch.local-9e7edb8f94` built successfully, passed macOS payload validation, and was signed and staged by the existing Mac build script. The running app stays open; installation waits for it to close.
- **Updated build:** the merged nightly was also rebuilt as `v0.1.11-nightly.20261117.4838-dpaluch.local-0ebd305250`. Packaging and macOS payload validation pass. The existing script signed it and staged it in `~/Programming/t3code-dpaluch-nightly/.out/pending.app`; it replaces the earlier staged build and installs after the running app closes.
- **Validation:** 237 focused unit tests and 39 browser Markdown tests pass. UsageService uses `TMPDIR=/private/tmp` to avoid macOS `/var` symlink comparisons. The browser suite passes after refreshing its generated Vitest cache. Shared, desktop, mobile and server typechecks pass; web retains the existing missing-`session` error in `ThreadDetailsPanel.browser.test.tsx:145`. Conflict-file lint and marker checks pass. Upstream patch-file whitespace is preserved. No push or history rewrite.

### fork-traceability

- **Area:** development workflow and source traceability.
- **Change:** start this changelog and require BEGIN/END markers for new fork changes. Keep replaced lines as inactive comments above their replacements.
- **Why:** find each local customization, its original code and its reason without reconstructing the whole git history.
- **Files:** `AGENTS.md`, `dpaluch/CHANGELOG.md`, and the marked blocks in this integration.

<!-- - **Scope:** prospective policy. Earlier pricing, account usage, Jira and sync modifications are deferred to the separate backfill task. -->

- **Scope:** policy for new changes. The earlier pricing, session cost, account usage, Jira link and sync changes were marked later in `fork-backfill`.
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

## 2026-11-11

### account-usage

- **Area:** Usage page, usage merge, server usage sources and client runtime.
- **Change:** split cost and tokens by provider account. The server lists the provider instances that own each history directory. The Usage page shows each account under its provider. The provider dropdown can hide one account and keep the others. Accounts that share a history directory show as one entry.
- **Why:** with two Codex or two Claude accounts, Usage showed one total per provider.
- **Files:** `apps/server/src/usage/UsageService.ts` and test, `apps/web/src/components/usage/UsagePage.tsx`, `usagePagePreferences.ts` and test, `usageProviders.ts` and test, `apps/web/src/state/usage.ts`, `docs/user/usage.md`, `packages/client-runtime/src/state/usageAccounts.ts` and test, `packages/contracts/src/usage.ts`, `packages/shared/src/usageMerge.ts` and test, and `packages/client-runtime/package.json`.
- **Related commit:** `bfb4553a4c`. The merge `0ebd305250` kept the account totals under upstream paragraph markup (`nightly-20261117`).
- **Markers:** 56 pairs in 14 files. Upstream text of replaced blocks stays as inactive comments.
- **Validation:** see `fork-backfill`. Usage tests pass.

#### JSON record

`packages/client-runtime/package.json` adds the following export after `./state/usage`. Existing exports remain unchanged. JSON does not permit inline comments, so this entry is its change marker.

```json
"./state/usage-accounts": {
  "types": "./src/state/usageAccounts.ts",
  "default": "./src/state/usageAccounts.ts"
}
```

## 2026-11-07

### work-jira-link

- **Area:** web chat toolbar.
- **Change:** threads in the work folder show the Jira ticket of their branch left of the branch name. The link opens in the system browser. `BranchToolbar` gets a `beforeBranch` slot so the branch keeps its place. The work folder and the Jira browse URL come from the build (`VITE_DPALUCH_WORK_FOLDER`, `VITE_DPALUCH_JIRA_BROWSE_URL`). Without them the link is off.
- **Why:** open the ticket of a work thread in one click, without putting work paths or company URLs in the public code.
- **Files:** `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/BranchToolbar.tsx`, `apps/web/src/components/chat/WorkJiraTicketLink.tsx`, `apps/web/src/lib/workJiraTicket.ts` and test, `apps/web/src/vite-env.d.ts`.
- **Related commits:** `90548be81b` (link) and `0f7293b2a5` (place left of the branch name).
- **Markers:** 9 pairs in 6 files.
- **Validation:** see `fork-backfill`. `workJiraTicket` tests pass.

### session-cost-cache

- **Area:** web thread details card.
- **Change:** add a "Session cost and cache" section (off by default) with the API price estimate of the thread, the prompt cache hit rate and the time until the cache expires. A cold cache shows how many tokens the next message writes to the cache again. Usage limit rows show the time to reset next to the percentage.
- **Why:** see the cost and cache state of a thread, like a terminal status line.
- **Files:** `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/chat/ThreadDetailsPanel.tsx`, `ThreadDetailsUsage.tsx`, `threadDetailsItems.ts`, `apps/web/src/lib/sessionUsage.ts` and test.
- **Related commits:** `a8a9afe6bc` and the cold-cache part of `90548be81b`.
- **Depends on:** `price-usage`. Servers without `server.priceUsage` show "Unavailable" for the cost row.
- **Markers:** 19 pairs in 6 files.
- **Validation:** see `fork-backfill`. `sessionUsage` tests pass. The web typecheck error at `ThreadDetailsPanel.browser.test.tsx:145` comes from the required `session` prop of this change; the test file is not updated.

### price-usage

- **Area:** server usage service, RPC contract and client runtime.
- **Change:** add the `server.priceUsage` RPC. It prices token totals with the same rates, overrides and model aliases as Usage.
- **Why:** the session cost row needs prices for live thread totals.
- **Source:** copied from upstream pull request https://github.com/pingdotgg/t3code/pull/32261 with the same names. Drop commit `2710b61680` and these markers after that pull request is merged.
- **Files:** `apps/server/src/auth/RpcAuthorization.ts`, `apps/server/src/observability/RpcInstrumentation.ts`, `apps/server/src/usage/UsageService.ts` and test, `apps/server/src/ws.ts`, `packages/client-runtime/src/state/server.ts`, `packages/contracts/src/rpc.ts`, `packages/contracts/src/usage.ts`.
- **Related commit:** `2710b61680`.
- **Markers:** 14 pairs in 8 files.
- **Validation:** see `fork-backfill`. The `UsageService` test "prices turn totals with overrides and aliases for Insights" passes.

### sync-script

- **Area:** branch maintenance.
- **Change:** add `dpaluch/sync.sh` and `dpaluch/prs.txt`. The script merges the newest upstream nightly tag and the newest head of each listed upstream pull request into `dpaluch-nightly`. With `--push` it also pushes the branch and tags the new head for the Mac build.
- **Why:** keep the fork on the newest nightly without manual merges.
- **Files:** `dpaluch/sync.sh`, `dpaluch/prs.txt`. Both are new files, wrapped as a whole. The code is not changed.
- **Related commit:** `adec8ad4aa`.
- **Markers:** 1 pair in each file.

<!-- # DPALUCH - changes END [fork-traceability] -->
