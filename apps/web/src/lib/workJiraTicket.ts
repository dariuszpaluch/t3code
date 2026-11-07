// A Jira key at the start of the branch name or after a prefix: GAMG-337-fix, feature/GAMG-337-fix.
const JIRA_KEY = /(?:^|\/)([A-Z][A-Z0-9]+-\d+)/;

/** The Jira key in a branch name, or null. */
export const jiraKeyOf = (branch: string): string | null => JIRA_KEY.exec(branch)?.[1] ?? null;

/** True when `path` is `folder` itself or a path inside it. */
export const isInsideFolder = (path: string, folder: string): boolean => {
  const base = folder.replace(/\/+$/, "");
  return base.length > 0 && (path === base || path.startsWith(`${base}/`));
};

export interface WorkJiraTicket {
  readonly key: string;
  readonly url: string;
}

/**
 * The Jira ticket of a work thread: its folder is inside `workFolder` and its branch has a Jira key.
 * Null when either is missing or when the build has no work folder or Jira URL.
 */
export function workJiraTicket(input: {
  readonly branch: string | null;
  readonly cwd: string | null;
  readonly workFolder: string;
  readonly browseUrl: string;
}): WorkJiraTicket | null {
  const { branch, cwd, workFolder, browseUrl } = input;
  if (!branch || !cwd || !browseUrl || !isInsideFolder(cwd, workFolder)) return null;
  const key = jiraKeyOf(branch);
  return key === null ? null : { key, url: `${browseUrl.replace(/\/+$/, "")}/${key}` };
}
