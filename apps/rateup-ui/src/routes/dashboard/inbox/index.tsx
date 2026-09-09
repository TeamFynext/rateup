import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Activity, useEffect } from "react";

import { useContactById } from "@/backend/campaign/contacts/contacts.query";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.tsx";
import Analytics from "@/components/whatsapp/inbox/analytics/analaytics.tsx";
import WaInboxChatDisplay from "@/components/whatsapp/inbox/chatdisplay/index.tsx";
import WaInboxChatSelect from "@/components/whatsapp/inbox/chatselect/index.tsx";
import InboxSettings from "@/components/whatsapp/inbox/InboxSettings/index.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { cn } from "@/lib/utils.ts";
import { useContactsStore } from "@/store/inbox.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";

export const Route = createFileRoute("/dashboard/inbox/")({
  /** Declares the search params this route reads, so links to it type-check. */
  validateSearch: (search: Record<string, unknown>): { tab?: string; contactId?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    contactId: typeof search.contactId === "string" ? search.contactId : undefined,
  }),
  component: WhatsAppInbox,
});

function WhatsAppInbox() {
  const searchParams: { tab?: string; contactId?: string } = useSearch({
    from: Route.id,
  });
  const tab = searchParams.tab;
  const contactId = searchParams.contactId;
  const navigate = useNavigate();

  const { selectedContact, setSelectedContact, contactsById } = useContactsStore();
  // Rows are keyed by ticket (conversation) id, so a `?contactId=` deep link has
  // to be resolved by scanning for that contact's row rather than a Map lookup.
  const rowForContactId = contactId
    ? (Array.from(contactsById.values()).find((c) => c?.id === contactId) ?? null)
    : null;
  const { data: fetchedContact } = useContactById(contactId && !rowForContactId ? contactId : "");

  useEffect(() => {
    if (contactId) {
      if (selectedContact?.id !== contactId) {
        const contactFromStore = rowForContactId;
        let consumed = false;
        if (contactFromStore) {
          setSelectedContact(contactFromStore);
          consumed = true;
        } else if (fetchedContact) {
          // A contact fetched by id carries no list-side `updatedAt`; the store
          // registers it as a synthesized row, which is what this path wants.
          setSelectedContact(fetchedContact as ContactWithUpdatedAt);
          consumed = true;
        }
        if (consumed) {
          navigate({
            to: "/dashboard/inbox",
            search: { tab } as never,
            replace: true,
          });
        }
      } else {
        // The chat is already selected, just consume the parameter to clear it from the URL
        navigate({
          to: "/dashboard/inbox",
          search: { tab } as never,
          replace: true,
        });
      }
    }
  }, [
    contactId,
    fetchedContact,
    contactsById,
    selectedContact?.id,
    setSelectedContact,
    navigate,
    tab,
  ]);

  useEffect(() => {
    if (!tab) {
      navigate({
        to: "/dashboard/inbox",
        replace: true,
        // Lowercase: every consumer compares against lowercase tab values, so
        // "All" silently fell through to the legacy branch.
        //
        // `contactId` is carried across rather than dropped: this runs on the
        // same mount as the effect above, and a deep link whose contact is not
        // in the store yet — the list has not loaded, the fetch by id is still
        // in flight — has not been consumed at that point. Rewriting the URL
        // without it threw the link away, and the thread only opened on a
        // second click, once the contact was in cache to be resolved
        // synchronously.
        search: { tab: "open", ...(contactId && { contactId }) } as never,
      });
    }
  }, [tab, contactId]);

  return (
    <div className="h-full min-h-0">
      {tab === "analytics" ? (
        <Analytics />
      ) : tab === "settings" ? (
        <InboxSettings />
      ) : (
        <ResizeableChat />
      )}
    </div>
  );
}

/**
 * List and thread, side by side from `lg` up and stacked below it.
 *
 * The two panes are one tree at every width — no viewport branch in JS, so there
 * is no first-paint flash of the wrong layout and neither pane remounts (losing
 * its scroll position and in-flight queries) when the window crosses the
 * breakpoint. Which pane is on screen when stacked follows the selection itself
 * rather than a separate "is the thread open" flag: a second source of truth for
 * the same thing is exactly what used to drift out of step with the selection.
 */
function ResizeableChat() {
  const hasSelection = useContactsStore((s) => Boolean(s.selectedContact));
  // Matches the `lg` breakpoint the CSS above uses to stack the panes.
  const isStacked = useMediaQuery("(max-width: 1023.98px)");
  const shouldHideListPanel = isStacked && hasSelection;
  const shouldHideThreadPanel = isStacked && !hasSelection;
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      // A panel's `className` goes on an inner div by design ("to avoid styles
      // that interfere with Flex layout"), so the stacked layout cannot be
      // written on the panels themselves — sizing lives on the outer
      // `<div data-panel id=…>` the library documents, and that is what these
      // target. `!` because those wrappers carry `display` and `flex` inline,
      // which no selector outranks on its own.
      className={cn(
        "h-full",
        "max-lg:*:data-panel:flex-[1_1_100%]!",
        shouldHideListPanel && "max-lg:[&>#inbox-list-panel]:hidden!",
        shouldHideThreadPanel && "max-lg:[&>#inbox-thread-panel]:hidden!",
      )}
    >
      <ResizablePanel id="inbox-list-panel" defaultSize={"28%"} minSize={"22%"} maxSize={"40%"}>
        {/* While the thread covers the list, the list stops rendering entirely —
            every store change (each arriving message, each status receipt) was
            re-rendering a virtualized list nobody could see. `Activity` keeps its
            state and DOM, so coming back is a single render rather than a rebuild.
            The media query only gates that render skipping, never the layout: if
            it is momentarily wrong (before hydration) the pane merely renders when
            it did not have to, and CSS still decides what is on screen. */}
        <Activity mode={isStacked && hasSelection ? "hidden" : "visible"}>
          <WaInboxChatSelect />
        </Activity>
      </ResizablePanel>
      {/* Dragging only means something when both panes are on screen, so the
          handle exists from lg up. Stated as hidden-by-default rather than
          hidden-below-lg: that beats the handle's own `flex` outright instead of
          relying on the media-query rule being emitted later. */}
      <ResizableHandle className="hidden lg:flex cursor-col-resize" />
      <ResizablePanel id="inbox-thread-panel" defaultSize={"72%"} minSize={"60%"} maxSize={"78%"}>
        <WaInboxChatDisplay />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
