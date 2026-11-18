// # DPALUCH - changes BEGIN [work-jira-link]: Link the Jira ticket of a work thread's branch next to the branch name.
// # DPALUCH - changes BEGIN [nightly-20261118]: Translate the ticket link label with the new upstream UI.
import { useGT } from "gt-react";
// # DPALUCH - changes END [nightly-20261118]
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
  // # DPALUCH - changes BEGIN [nightly-20261118]: Read the current UI language.
  const gt = useGT();
  // # DPALUCH - changes END [nightly-20261118]
  const ticket = workJiraTicket({
    ...props,
    workFolder: WORK_FOLDER,
    browseUrl: JIRA_BROWSE_URL,
  });
  if (ticket === null) return null;

  return (
    <a
      href={ticket.url}
      // # DPALUCH - changes BEGIN [nightly-20261118]: Preserve the ticket key in the translated label.
      // aria-label={`Open ${ticket.key} in Jira`}
      aria-label={gt("Open {ticket} in Jira", { ticket: ticket.key })}
      // # DPALUCH - changes END [nightly-20261118]
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
// # DPALUCH - changes END [work-jira-link]
