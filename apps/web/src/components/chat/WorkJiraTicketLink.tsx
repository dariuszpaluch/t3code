import { TicketIcon } from "lucide-react";

import { readLocalApi } from "../../localApi";
import { workJiraTicket } from "../../lib/workJiraTicket";

// Set at build time, so the public code holds no work paths or company URLs. Empty turns it off.
const WORK_FOLDER = import.meta.env.VITE_DPALUCH_WORK_FOLDER ?? "";
const JIRA_BROWSE_URL = import.meta.env.VITE_DPALUCH_JIRA_BROWSE_URL ?? "";

/** Links the Jira ticket of a work thread's branch, next to the branch name. */
export function WorkJiraTicketLink(props: {
  readonly branch: string | null;
  readonly cwd: string | null;
}) {
  const ticket = workJiraTicket({
    ...props,
    workFolder: WORK_FOLDER,
    browseUrl: JIRA_BROWSE_URL,
  });
  if (ticket === null) return null;

  return (
    <a
      href={ticket.url}
      aria-label={`Open ${ticket.key} in Jira`}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
      onClick={(event) => {
        // Jira needs the login of the system browser, not the in-app preview.
        const api = readLocalApi();
        if (!api) return;
        event.preventDefault();
        void api.shell.openExternal(ticket.url).catch(() => window.open(ticket.url, "_blank"));
      }}
    >
      <TicketIcon className="size-3.5" aria-hidden />
      {ticket.key}
    </a>
  );
}
