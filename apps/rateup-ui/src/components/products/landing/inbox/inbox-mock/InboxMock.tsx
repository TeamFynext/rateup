import { useScript } from "../../shared/useScript";
import ListPane from "./ListPane";
import NavPane from "./NavPane";
import { INBOX_SCRIPT } from "./script";
import SidePane from "./SidePane";
import ThreadPane from "./ThreadPane";

/**
 * The inbox, playing one conversation from first message to a closed ticket.
 *
 * Phones get the thread alone, as the mobile app shows one pane at a time — it carries the
 * animation and the session chip, and the queue is the first feature card below.
 */
export default function InboxMock() {
  const [ref, state] = useScript(INBOX_SCRIPT);

  return (
    <div
      ref={ref}
      role="img"
      aria-label="The RateUp inbox: a queue of WhatsApp, Instagram and Messenger conversations, an open WhatsApp thread with a private note, and the ticket's assignee, stage and tags."
      className="overflow-hidden rounded-[20px] border border-ru-n-200 bg-white shadow-[0_24px_64px_rgba(16,24,40,0.1)] select-none"
    >
      {/* Fixed height: the script appends messages, and the page below must not move. */}
      <div
        aria-hidden="true"
        className="grid h-120 grid-cols-1 text-left sm:h-138 sm:grid-cols-[17rem_minmax(0,1fr)] lg:grid-cols-[11rem_17rem_minmax(0,1fr)] xl:grid-cols-[11rem_17rem_minmax(0,1fr)_14.5rem]"
      >
        <NavPane newCount={state.newCount} />
        <ListPane rows={state.rows} newCount={state.newCount} />
        <ThreadPane state={state} />
        <SidePane />
      </div>
    </div>
  );
}
