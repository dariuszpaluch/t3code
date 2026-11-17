// # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
import { parseObsidianOpenUrl } from "@t3tools/shared/obsidianUri";
// # DPALUCH - changes END [obsidian-links]
import * as Schema from "effect/Schema";
import { Linking } from "react-native";

const ExternalUrlTarget = Schema.Literals([
  "file-preview",
  "markdown-link",
  "pull-request",
  "provider-auth",
  "html-render",
  "mcp-app",
  "secret-request",
]);

export type ExternalUrlTarget = typeof ExternalUrlTarget.Type;

export class ExternalUrlOpenError extends Schema.TaggedError<ExternalUrlOpenError>()(
  "ExternalUrlOpenError",
  {
    target: ExternalUrlTarget,
    scheme: Schema.String,
    host: Schema.optional(Schema.String),
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to open ${this.target} URL with the ${this.scheme} scheme.`;
  }
}

function externalUrlMetadata(url: string): { readonly scheme: string; readonly host?: string } {
  try {
    const parsed = new URL(url);
    return {
      scheme: parsed.protocol.replace(/:$/, "") || "unknown",
      host: parsed.hostname || undefined,
    };
  } catch {
    return {
      scheme: /^([a-z][a-z\d+.-]*):/i.exec(url)?.[1]?.toLowerCase() ?? "unknown",
    };
  }
}

export async function tryOpenExternalUrl(url: string, target: ExternalUrlTarget): Promise<boolean> {
  // # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
  if (externalUrlMetadata(url).scheme === "obsidian" && parseObsidianOpenUrl(url) === null) {
    return false;
  }
  // # DPALUCH - changes END [obsidian-links]
  try {
    await Linking.openURL(url);
    return true;
  } catch (cause) {
    const error = new ExternalUrlOpenError({ target, ...externalUrlMetadata(url), cause });
    console.error(error.message, {
      _tag: error._tag,
      target: error.target,
      scheme: error.scheme,
      host: error.host,
      stack: error.stack,
    });
    return false;
  }
}
