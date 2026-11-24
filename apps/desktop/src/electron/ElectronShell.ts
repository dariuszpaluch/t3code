// # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
import { parseObsidianOpenUrl } from "@t3tools/shared/obsidianUri";
// # DPALUCH - changes END [obsidian-links]
import { MAC_PERMISSION_SETTINGS_URLS } from "../permissions/MacPermission.ts";
import {
  isLocalEditorFileUrl,
  REMOTE_CAPABLE_EDITOR_IDS,
  remoteSchemeForEditor,
  type SystemSettingsPane,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as Electron from "electron";

// Remote editor deep links and local editor file links must reach the OS handler.
const SAFE_WEB_PROTOCOLS = new Set(["http:", "https:"]);
const REMOTE_EDITOR_PROTOCOLS = new Set(
  REMOTE_CAPABLE_EDITOR_IDS.flatMap((id) => {
    const scheme = remoteSchemeForEditor(id);
    return scheme === undefined ? [] : [`${scheme}:`];
  }),
);

// "Use T3 Code in another app" opens these apps (apps/web/src/components/mcp/mcpApps.ts). Match
// each exact link shape the wizard sends, never a whole scheme.
const isAppLaunchUrl = (url: URL) =>
  url.protocol === "grokbot:" &&
  url.host === "app" &&
  url.pathname === "/v1/prompt" &&
  url.username.length === 0 &&
  url.password.length === 0 &&
  url.hash.length === 0 &&
  [...url.searchParams.keys()].join() === "text";

// Zed embeds [user@]host in the path; reject passwords and ports there.
const ZED_SSH_PATHNAME = /^\/(?:[^/@:]+@)?[^/@:]+\/.*$/;

const isRemoteEditorUrl = (url: URL) =>
  REMOTE_EDITOR_PROTOCOLS.has(url.protocol) &&
  url.username.length === 0 &&
  url.password.length === 0 &&
  (url.protocol === "zed:"
    ? url.host === "ssh" && ZED_SSH_PATHNAME.test(url.pathname)
    : url.protocol === "jetbrains:"
      ? url.host === "gateway" &&
        url.pathname === "/ssh/environment" &&
        (url.searchParams.get("h") ?? "").length > 0
      : url.host === "vscode-remote" &&
        url.pathname.startsWith("/ssh-remote+") &&
        url.pathname.length > "/ssh-remote+".length);

export function parseSafeExternalUrl(rawUrl: unknown): Option.Option<string> {
  if (typeof rawUrl !== "string") {
    return Option.none();
  }

  try {
    const url = new URL(rawUrl);
    // # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
    /* oxlint-disable t3code/no-low-value-comments -- Fork policy keeps the previous implementation here. */
    //     return SAFE_WEB_PROTOCOLS.has(url.protocol) ||
    //       isAppLaunchUrl(url) ||
    //       isRemoteEditorUrl(url) ||
    //       isLocalEditorFileUrl(url)
    //       ? Option.some(url.href)
    //       : Option.none();
    /* oxlint-enable t3code/no-low-value-comments */
    return SAFE_WEB_PROTOCOLS.has(url.protocol) ||
      isAppLaunchUrl(url) ||
      isRemoteEditorUrl(url) ||
      isLocalEditorFileUrl(url) ||
      parseObsidianOpenUrl(rawUrl) !== null
      ? Option.some(url.href)
      : Option.none();
    // # DPALUCH - changes END [obsidian-links]
  } catch {
    return Option.none();
  }
}

/** Links that open in the browser, for callers such as popups that carry no identity. */
export const parseWebExternalUrl = (rawUrl: unknown): Option.Option<string> =>
  Option.filter(parseSafeExternalUrl(rawUrl), (url) =>
    SAFE_WEB_PROTOCOLS.has(new URL(url).protocol),
  );

export class ElectronShell extends Context.Service<
  ElectronShell,
  {
    readonly openExternal: (rawUrl: unknown) => Effect.Effect<boolean>;
    readonly openSystemSettings: (pane: SystemSettingsPane) => Effect.Effect<boolean>;
    readonly copyText: (text: string) => Effect.Effect<void>;
  }
>()("@t3tools/desktop/electron/ElectronShell") {}

/** @public */
export const make = ElectronShell.of({
  openExternal: Effect.fn("ElectronShell.openExternal")(function (rawUrl) {
    return Option.match(parseSafeExternalUrl(rawUrl), {
      onNone: () => Effect.succeed(false),
      onSome: (externalUrl) =>
        Effect.promise(() =>
          Electron.shell.openExternal(externalUrl).then(
            () => true,
            () => false,
          ),
        ),
    });
  }),
  openSystemSettings: Effect.fn("ElectronShell.openSystemSettings")(function (pane) {
    return Effect.promise(() =>
      Electron.shell.openExternal(MAC_PERMISSION_SETTINGS_URLS[pane]).then(
        () => true,
        () => false,
      ),
    );
  }),
  copyText: Effect.fn("ElectronShell.copyText")(function (text) {
    return Effect.promise(() => Electron.clipboard.writeText(text).catch(() => undefined));
  }),
});

export const layer = Layer.succeed(ElectronShell, make);
