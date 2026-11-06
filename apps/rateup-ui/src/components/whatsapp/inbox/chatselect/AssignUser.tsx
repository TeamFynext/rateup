import { chunk } from "lodash";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useBulkAssignInboxToUser } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Combobox } from "@/components/ui/combobox.tsx";
import { Progress, ProgressLabel } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  AssigneeOptionList,
  useAssigneeOptions,
} from "@/components/whatsapp/inbox/assign/AssigneeOptions.tsx";
import type { AssigneeOption } from "@/components/whatsapp/inbox/assign/AssigneeOptions.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useContactsStore } from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { INBOX_BULK_CHUNK_SIZE } from "@/utils/constants.ts";

const BulkAssignUser = ({
  contactIds,
  filterData,
  onSuccess,
}: {
  contactIds: string[];
  filterData: string;
  onSuccess?: () => void;
}) => {
  const { user } = useUser();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const { groups, isPending, nameOf, visibleTeamOf } = useAssigneeOptions({
    canUnassign: false,
    withTeams: true,
  });
  const { updateContactById } = useContactsStore();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { t } = useTranslation();

  const staffMembers = teamMembers?.data ?? [];
  const bulkAssignMutation = useBulkAssignInboxToUser(filterData);

  /**
   * Assign in chunks, marking each chunk's rows assigned as it lands. The
   * server assigns one contact at a time, so a large selection in one request
   * could outlive the client's timeout even though the server finishes it —
   * chunking keeps every request short and gives the progress bar real steps.
   *
   * `conversationStatus` is set alongside the contact-level status: the store
   * judges a row by its ticket's status, so without it the badge and the
   * Mine/New tab membership would not change until a reload.
   */
  const runAssign = async (
    target: { assignee: { userId: string; teamId: string } } | { teamId: string },
  ) => {
    let done = 0;
    setProgress({ done, total: contactIds.length });
    try {
      for (const ids of chunk(contactIds, INBOX_BULK_CHUNK_SIZE)) {
        const { results } = await bulkAssignMutation.mutateAsync({ contactIds: ids, ...target });
        for (const { contactId, success, result } of results ?? []) {
          // A team hands each chat to a different member, so the owner comes from the result.
          const owner = result?.assignees?.[0];
          if (!success || !owner) continue;
          updateContactById(contactId, (contact) => ({
            ...contact,
            waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
            conversationStatus: WaMessageAssignStatus.ASSIGNED,
            assignedUsers: [{ id: owner.userId, name: nameOf(owner.userId), teamId: owner.teamId }],
          }));
        }
        done += ids.length;
        setProgress({ done, total: contactIds.length });
      }
      onSuccess?.();
    } catch {
      // The mutation toasts the failure; the dialog stays open to retry.
    } finally {
      setProgress(null);
    }
  };

  const pick = (item: AssigneeOption | null) => {
    if (!item || progress) return;
    if (item.kind === "team") {
      void runAssign({ teamId: item.team.id });
      return;
    }
    const member =
      item.kind === "person" ? item.member : staffMembers.find((m) => m.id === user?.userId);
    const userId = member?.id ?? user?.userId ?? "";
    const teamId = (member && visibleTeamOf(member)) || (user?.teams?.[0] ?? "");
    void runAssign({ assignee: { userId, teamId } });
  };

  if (isPending) return <Skeleton className="h-72 w-full rounded-lg" />;

  if (progress) {
    return (
      <Progress
        value={progress.total ? (progress.done / progress.total) * 100 : 0}
        className="gap-x-3 gap-y-1.5 py-6"
      >
        <ProgressLabel className="text-xs">{t("Assigning chats")}…</ProgressLabel>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {progress.done} / {progress.total}
        </span>
      </Progress>
    );
  }

  return (
    // The panel's picker, rendered in place rather than as a popup.
    <Combobox<AssigneeOption>
      items={groups}
      value={null}
      onValueChange={pick}
      inline
      open
      autoHighlight
    >
      <div className="overflow-hidden rounded-md bg-popover text-popover-foreground ring-1 ring-foreground/10">
        <AssigneeOptionList
          autoFocus
          placeholder={t("Search people or teams")}
          listClassName="max-h-72"
        />
      </div>
    </Combobox>
  );
};

export default BulkAssignUser;
