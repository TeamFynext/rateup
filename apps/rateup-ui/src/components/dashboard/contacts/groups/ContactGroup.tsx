import { IconCheck, IconEdit, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { useNavigate, useParams, useRouter } from "@tanstack/react-router";
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useContactGroupById,
  useDeleteGroupMutation,
  useEditContactGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { BackLink } from "@/components/common/back-link.tsx";
import { PAGE_TITLE } from "@/components/common/page-heading.tsx";
import { ContactDetailHost } from "@/components/Contacts/ContactDetailedView.tsx";
import { ParticipantMenu } from "@/components/Contacts/GroupParticipant.tsx";
import { contactColumn } from "@/components/Contacts/utils/utils.tsx";
import { DataTableToolbar } from "@/components/dashboard/contacts/groups/$groupId/data-table-toolbar.tsx";
import { GroupIconTile } from "@/components/dashboard/contacts/groups/GroupPage.tsx";
import type { GroupTableFilter } from "@/components/dashboard/contacts/store/group-table-store.ts";
import { useGroupTableStore } from "@/components/dashboard/contacts/store/group-table-store.ts";
import type { DataTableFeatures } from "@/components/Table/data-table-features.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { cn } from "@/lib/utils.ts";
import { CONTACT_SORT } from "@/utils/constants.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { deleteUploadedFiles, uploadFile } from "@/utils/file-upload/upload.ts";

export function ContactGroup() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useDebouncedState("", 500);
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const [columnFilters, setColumnFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({
    strict: false,
  });
  const groupId = params?.groupId as string;

  const { customFields } = useCustomFieldsContext();
  const { filter, setGroupDetails } = useGroupTableStore();
  const [groupName, setGroupName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const {
    isPending: isLoading,
    data: groupDetails,
    error: groupByIderror,
    refetch: refetchgroupById,
  } = useContactGroupById(
    groupId?.toString(),
    true,
    pagination,
    searchTerm,
    sorting?.[0],
    columnFilters,
  );
  const deleteGroupMutation = useDeleteGroupMutation();
  const confirm = useConfirm();

  useEffect(() => {
    setGroupDetails(groupDetails ?? null);
  }, [groupDetails]);

  const column: ColumnDef<DataTableFeatures, ContactsData>[] = [
    ...contactColumn(customFields ?? []),
    {
      header: "Action",
      accessorFn: (row) => row,
      enableSorting: false,
      enableColumnFilter: false,
      id: "action",
      cell: (info) => (
        <ParticipantMenu contactId={info.row.original.id} groupId={groupDetails?.id ?? ""} />
      ),
      meta: { title: "Action" },
    },
  ];
  /**
   * Skeleton only while there is nothing to show. Including `isRefetching` here meant every
   * invalidation — removing a member, adding one, renaming the group — tore the whole table
   * down to skeleton rows and back; react-query keeps the previous page cached, so the rows
   * can stay put and simply update when the refetch lands.
   */
  const loadingState = isLoading;
  const [showEditIconDialog, setShowEditIconDialog] = useState(false);
  const editContactGroupMutation = useEditContactGroupMutation(groupDetails?.id ?? "");
  function handleSaveGroupName() {
    if (!groupName.trim().length || groupName === groupDetails?.name) return;
    editContactGroupMutation.mutate(
      {
        name: groupName,
      },
      {
        onSuccess: () => {
          toast.success("Group name updated successfully");
          setGroupName("");
          setIsEditingName(false);
        },
        onError: (error) => {
          toast.error(error?.message || "Error in updating group name");
        },
      },
    );
  }
  function handleCancelEditName() {
    setIsEditingName(false);
  }
  async function handleDeleteGroup() {
    const shouldDelete = await confirm({
      title: "Delete Group",
      description: "Are you sure you want to delete this group?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!shouldDelete) return;

    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        toast.success("Group deleted successfully");
        navigate({
          to: "/dashboard/contacts/groups",
        });
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error?.message || "Error in deleting group");
      },
    });
  }

  /** A column is identified by its accessor key when it has one, else by its id. */
  const columnKey = (column: { accessorKey?: unknown; id?: string }) =>
    String(column.accessorKey ?? column.id ?? "");

  const defaultColumnVisibility = useMemo(
    () =>
      column.reduce((visibility: Record<string, boolean>, key) => {
        if (
          !["select", "name", "phone", "ContactLabelMap", "source", "createdAt", "action"].includes(
            columnKey(key),
          )
        ) {
          visibility[columnKey(key)] = false;
        }
        return visibility;
      }, {}),
    [column],
  );
  useEffect(() => {
    const filterKeys = (Object.keys(filter) as (keyof GroupTableFilter)[]).filter(
      (f) => f !== "searchTerm",
    );
    setSearchTerm(filter.searchTerm);
    setColumnFilters(filterKeys.map((key) => ({ id: key, value: filter[key] })));
  }, [filter]);

  if (groupByIderror) return <ErrorComponent refetch={refetchgroupById} />;

  const memberCount = groupDetails?._count?.contacts ?? 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <BackLink
        to="/dashboard/contacts/groups"
        label={t("Groups")}
        onClick={() => void router.invalidate()}
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setShowEditIconDialog(true)}
            aria-label={t("Change the group icon")}
            className="group/icon relative shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <GroupIconTile icon={groupDetails?.icon} className="size-12 rounded-xl" />
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100">
              <IconUpload className="size-4 text-white" />
            </span>
          </button>
          <div className="flex min-w-0 flex-col gap-1">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : isEditingName ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveGroupName();
                }}
              >
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleCancelEditName();
                  }}
                  aria-label={t("Group name")}
                  className="h-9 w-64 text-base"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label={t("Save")}
                  loading={editContactGroupMutation.isPending}
                >
                  <IconCheck />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t("Cancel")}
                  onClick={handleCancelEditName}
                >
                  <IconX />
                </Button>
              </form>
            ) : (
              <h1 className={cn(PAGE_TITLE, "truncate")}>{groupDetails?.name}</h1>
            )}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>
                {t("{count, plural, one {# member} other {# members}}", { count: memberCount })}
              </span>
              {groupDetails?.team?.name && (
                <>
                  <span aria-hidden>·</span>
                  <Badge variant="secondary">{groupDetails.team.name}</Badge>
                </>
              )}
            </p>
          </div>
        </div>
        {!isEditingName && (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGroupName(groupDetails?.name ?? "");
                setIsEditingName(true);
              }}
            >
              <IconEdit data-icon="inline-start" />
              {t("Rename")}
            </Button>
            <Button variant="destructive" onClick={() => void handleDeleteGroup()}>
              <IconTrash data-icon="inline-start" />
              {t("Delete Group")}
            </Button>
          </div>
        )}
      </div>
      <div className="min-h-0 grow">
        <DataTable
          columns={column}
          data={groupDetails?.contacts || []}
          serverSide={{
            onPaginationChange: setPagination,
            sorting,
            onSortingChange: setSorting,
            rowCount: groupDetails?.totalCount ?? 0,
            pagination: pagination,
          }}
          isPending={loadingState}
          DataTableToolbar={DataTableToolbar}
          defaultColumnVisibility={defaultColumnVisibility}
        />
      </div>
      <ContactGroupIconEditDialog
        opened={showEditIconDialog}
        setOpened={setShowEditIconDialog}
        group={groupDetails!}
      />
      <ContactDetailHost />
    </div>
  );
}

function ContactGroupIconEditDialog({
  opened,
  setOpened,
  group,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  // Only these three fields are read here.
  group: Pick<ContactGroup, "id" | "icon" | "name">;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editContactGroupMutation = useEditContactGroupMutation(group?.id);

  async function handleRemoveIcon() {
    await deleteUploadedFiles({ fileKeyArray: [{ Key: group.icon }] });
    editContactGroupMutation.mutate(
      {
        icon: "",
      },
      {
        onSuccess: () => {
          toast.success("Icon removed successfully");
          setOpened(false);
        },
        onError: (error) => {
          toast.error(error?.message || "Error removing icon");
        },
      },
    );
  }
  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const oldIcon = group.icon;
    if (!file) return;
    const icon = await uploadFile(file);
    editContactGroupMutation.mutate(
      {
        icon,
      },
      {
        onSuccess: async () => {
          toast.success("Icon updated successfully");
          setOpened(false);
          deleteUploadedFiles({ fileKeyArray: [{ Key: oldIcon }] });
        },
        onError: (error) => {
          toast.error(error?.message || "Error updating icon");
        },
      },
    );
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Group icon")}</DialogTitle>
          <DialogDescription>
            {t("Upload a square image, at least 200×200 pixels, or remove the current one.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5">
          <GroupIconTile icon={group?.icon} className="size-28 rounded-2xl" />
          <div className="flex w-full flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              loading={editContactGroupMutation.isPending}
            >
              <IconUpload data-icon="inline-start" />
              {t("Upload new icon")}
            </Button>
            {group?.icon && (
              <Button variant="destructive" onClick={() => void handleRemoveIcon()}>
                <IconX data-icon="inline-start" />
                {t("Remove icon")}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpened(false)}>
            {t("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
