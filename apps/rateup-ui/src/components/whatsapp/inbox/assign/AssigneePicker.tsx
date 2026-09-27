import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useAssignOwner } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Combobox, ComboboxContent, ComboboxTrigger } from "@/components/ui/combobox.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import useContactStore, { useContactsStore, useMessagesStore } from "@/store/inbox.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { generateInternalMessageId } from "../util.tsx";
import { AssigneeOptionList, useAssigneeOptions } from "./AssigneeOptions.tsx";
import type { AssigneeOption } from "./AssigneeOptions.tsx";
import { buildAssignEvent, useAssignPickerRequest } from "./assignEvent.ts";

type Assignee = { id: string; name: string; teamId: string };

interface AssigneePickerProps {
  contact: ContactWithUpdatedAt;
  /** What the trigger shows; the picker adds the chevron. */
  children: ReactNode;
  triggerClassName?: string;
  align?: "start" | "end";
  /** Opens on the thread's `A` shortcut. Only one picker on screen should. */
  acceptsShortcut?: boolean;
}

/**
 * One owner per ticket: search, click, done. People are listed once however many
 * teams they are in — the API records them under the ticket's current team when
 * they belong to it — and a team row hands the ticket to one member in turn.
 */
export default function AssigneePicker({
  contact,
  children,
  triggerClassName,
  align = "start",
  acceptsShortcut = false,
}: Readonly<AssigneePickerProps>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const canAssign = useCan("inbox.assign");
  const [open, setOpen] = useState(false);
  const { filterData } = useContactStore();
  const assign = useAssignOwner(filterData ?? "");
  const { addMessage, removeMessage } = useMessagesStore();
  const updateContactById = useContactsStore((s) => s.updateContactById);

  const shortcutPending = useAssignPickerRequest((s) => s.pending);
  const consumeShortcut = useAssignPickerRequest((s) => s.consume);
  useEffect(() => {
    if (!acceptsShortcut || !shortcutPending) return;
    consumeShortcut();
    if (canAssign) setOpen(true);
  }, [shortcutPending, acceptsShortcut, canAssign, consumeShortcut]);

  const current: Assignee[] = contact.assignedUsers ?? [];
  const ownerId = current[0]?.id;

  const { groups, nameOf } = useAssigneeOptions({
    ownerId,
    canUnassign: current.length > 0,
    withTeams: true,
  });

  function pick(item: AssigneeOption | null) {
    if (!item || !user) return;
    setOpen(false);

    let userId: string | null = null;
    let teamId: string | null = null;
    if (item.kind === "me") userId = user.userId;
    if (item.kind === "person") userId = item.member.id;
    if (item.kind === "team") teamId = item.team.id;
    if (userId && userId === ownerId && current.length === 1) return;

    const rowKey = getRowKey(contact);
    const previous = current;
    const previousStatus = contact.waMessageAssignStatus;
    const setRow = (assignees: Assignee[], status: ContactWithUpdatedAt["waMessageAssignStatus"]) =>
      updateContactById(rowKey, (row) => ({
        ...row,
        assignedUsers: assignees,
        waMessageAssignStatus: status,
      }));

    // A team pick does not know its owner until the API has chosen one, so it
    // gets no optimistic line; the API writes it and the refetch brings it in.
    let event: ReturnType<typeof buildAssignEvent> | null = null;
    if (item.kind !== "team") {
      const added = userId ? [{ id: userId, name: nameOf(userId) }] : [];
      event = buildAssignEvent({
        contactId: contact.id,
        actor: { id: user.userId, name: user.userName, profilePhoto: user.profilePhoto },
        added,
        removed: previous.filter((p) => p.id !== userId),
      });
      addMessage(`${rowKey}_all`, event);
      addMessage(`${rowKey}_internal`, event);
      setRow(
        added.map((a) => ({ ...a, teamId: previous[0]?.teamId ?? "" })),
        added.length ? WaMessageAssignStatus.ASSIGNED : WaMessageAssignStatus.UNASSIGNED,
      );
    }
    const messageId = event?.id ?? generateInternalMessageId();

    assign.mutate(
      { contactId: contact.id, conversationId: contact.conversationId, userId, teamId, messageId },
      {
        onSuccess: (result) => {
          // Assigning a closed ticket opens its successor; the line belongs there.
          const landedOn = result?.conversation?.id ?? rowKey;
          if (event && landedOn !== rowKey) {
            removeMessage(`${rowKey}_all`, event.id);
            removeMessage(`${rowKey}_internal`, event.id);
            addMessage(`${landedOn}_all`, event);
            addMessage(`${landedOn}_internal`, event);
          }
          const owners = (result?.assignees ?? []).map((a) => ({
            id: a.userId,
            name: nameOf(a.userId),
            teamId: a.teamId,
          }));
          updateContactById(landedOn, (row) => ({
            ...row,
            assignedUsers: owners,
            waMessageAssignStatus: owners.length
              ? WaMessageAssignStatus.ASSIGNED
              : WaMessageAssignStatus.UNASSIGNED,
          }));
          toast.success(
            owners.length ? t("Assigned to {name}", { name: owners[0].name }) : t("Unassigned"),
          );
        },
        onError: (error) => {
          if (event) {
            removeMessage(`${rowKey}_all`, event.id);
            removeMessage(`${rowKey}_internal`, event.id);
            setRow(previous, previousStatus);
          }
          toast.error(getApiErrorMessage(error, t("Could not change the assignee")));
        },
      },
    );
  }

  if (!canAssign) return <div className={triggerClassName}>{children}</div>;

  return (
    <Combobox<AssigneeOption>
      items={groups}
      value={null}
      onValueChange={pick}
      open={open}
      onOpenChange={setOpen}
      autoHighlight
    >
      <ComboboxTrigger className={triggerClassName} disabled={assign.isPending}>
        {children}
      </ComboboxTrigger>
      <ComboboxContent className="w-72 p-0" align={align}>
        <AssigneeOptionList ownerId={ownerId} placeholder={t("Search people or teams")} />
      </ComboboxContent>
    </Combobox>
  );
}
