// # DPALUCH - changes BEGIN [obsidian-links]: Open Obsidian notes while keeping writing and plugin commands blocked.
const OPEN_PARAMETERS = new Set(["vault", "file", "path", "paneType"]);

/** Allow note navigation without exposing Obsidian's write or plugin commands. */
export const parseObsidianOpenUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "obsidian:" ||
      url.host !== "open" ||
      url.pathname !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== ""
    ) {
      return null;
    }
    if ([...url.searchParams.keys()].some((key) => !OPEN_PARAMETERS.has(key))) return null;
    return url.href;
  } catch {
    return null;
  }
};
// # DPALUCH - changes END [obsidian-links]
