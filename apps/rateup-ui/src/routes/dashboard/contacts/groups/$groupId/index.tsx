import { createFileRoute, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { Image } from "@unpic/react";
import { ArrowLeft, Check, Edit, Folder, Trash2, Upload, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import {
  useAddNewContactFromCSVMutation,
  useContactGroupById,
  useDeleteGroupMutation,
  useEditContactGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import ContactImportErrorModal from "@/components/Contacts/ContactImportErrorModal.tsx";
import { ParticipantMenu } from "@/components/Contacts/GroupParticipant.tsx";
import { CONTACT_SORT, contactColumn } from "@/components/Contacts/utils/utils.tsx";
import type { GroupTableFilter } from "@/components/dashboard/contacts/store/group-table-store.ts";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getInitials } from "@/components/ui/utils.ts";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";
import { deleteUploadedFiles, getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { DataTableToolbar } from "../../../../../components/dashboard/contacts/groups/$groupId/data-table-toolbar.tsx";
import { useGroupTableStore } from "../../../../../components/dashboard/contacts/store/group-table-store.ts";

export const Route = createFileRoute("/dashboard/contacts/groups/$groupId/")({
  component: ContactGroup,
});

function ContactGroup() {
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
  const createNewContactsFromCSV = useAddNewContactFromCSVMutation(groupId?.toString());
  const [groupName, setGroupName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const {
    isPending: isLoading,
    data: groupDetails,
    error: groupByIderror,
    refetch: refetchgroupById,
    isRefetching,
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
    setGroupDetails(groupDetails);
  }, [groupDetails]);

  const column: ColumnDef<any>[] = [
    ...contactColumn(customFields ?? []),
    {
      header: "Action",
      accessorFn: (row) => row,
      enableSorting: false,
      enableColumnFilter: false,
      id: "action",
      cell: (info) => (
        <ParticipantMenu contactId={info.row.original.id} groupId={groupDetails?.id} />
      ),
      meta: { title: "Action" },
    },
  ];
  const loadingState = isLoading || isRefetching;
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

  const defaultColumnVisibility = useMemo(
    () =>
      column.reduce((visibility: Record<string, boolean>, key) => {
        if (
          !["select", "name", "phone", "ContactLabelMap", "source", "createdAt", "action"].includes(
            (key as any)?.accessorKey || key?.id,
          )
        ) {
          visibility[(key as any)?.accessorKey || key?.id] = false;
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

  return (
    <div className="flex flex-col gap-3 h-full">
      <Card className="border-0 shadow-lg bg-linear-to-br from-white via-white to-blue-50/30 shrink-0 p-4">
        <div className="flex items-center justify-between gap-8">
          <div className="relative flex items-center gap-5 flex-1">
            <div className="relative shrink-0 group">
              <div
                className="w-16 h-16 rounded-2xl bg-linear-to-br from-rateup-orange via-orange-400 to-rateup-orange/80 flex items-center justify-center shadow-lg ring-4 ring-orange-100 cursor-pointer overflow-hidden relative transition-all hover:ring-primary"
                onClick={() => setShowEditIconDialog(true)}
              >
                {groupDetails?.icon ? (
                  <Image
                    src={getFileUrlFromKey(groupDetails?.icon)}
                    alt={groupDetails.name}
                    className="object-cover"
                    layout="fullWidth"
                    aspectRatio={1}
                    objectFit="cover"
                  />
                ) : (
                  <Folder />
                )}
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center shadow-md ring-4 ring-white">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Group Info with Inline Editing */}
            <div className="flex items-center gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGroupName();
                          if (e.key === "Escape") handleCancelEditName();
                        }}
                        className="h-9 text-xl border-2 border-primary focus:ring-1 focus:ring-primary/20 w-64"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveGroupName}
                        className="h-9 w-9 p-0 bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
                      >
                        {editContactGroupMutation.isPending ? (
                          <Spinner className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditName}
                        className="h-9 w-9 p-0 hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {groupDetails?.name}
                      </h1>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGroupName(groupDetails?.name);
                          setIsEditingName(true);
                        }}
                        className="h-8 w-8 p-0 hover:bg-blue-50 text-primary"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                {!isEditingName && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Manage group members and settings
                    </p>
                    <span className="text-xs text-muted-foreground">Team: </span>
                    <Badge className="mt-1"> {groupDetails?.team?.name}</Badge>
                  </div>
                )}
              </div>

              {!isEditingName && (
                <div className="flex flex-col items-center justify-center px-5 py-2 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 shrink-0 ml-auto">
                  <div className="text-3xl bg-linear-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                    {groupDetails?._count?.contacts || 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Total Members</div>
                </div>
              )}
            </div>
          </div>

          {!isEditingName && (
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate({
                    to: "/dashboard/contacts/groups",
                  });
                  void router.invalidate();
                }}
                className="gap-2 hover:bg-gray-100 h-9"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Groups</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteGroup()}
                className="h-9 gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Group
              </Button>
            </div>
          )}
        </div>
      </Card>
      <div className="grow min-h-0 overflow-auto border-0 shadow-lg bg-card">
        <DataTable
          columns={column}
          data={groupDetails?.contacts || []}
          serverSide={{
            onPaginationChange: setPagination,
            sorting,
            onSortingChange: setSorting,
            rowCount: groupDetails?.totalCount,
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
        group={groupDetails}
      />
      <ContactImportErrorModal
        body={(createNewContactsFromCSV?.error as any)?.response?.data}
        isError={createNewContactsFromCSV.isError}
      />
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editContactGroupMutation = useEditContactGroupMutation(group?.id);

  async function handleRemoveIcon() {
    await deleteUploadedFiles({ fileKeyArray: [{ Key: group.icon }] });
    editContactGroupMutation.mutate(
      {
        icon: null,
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
    const icon = await uploadFile(file);
    editContactGroupMutation.mutate(
      {
        icon,
      },
      {
        onSuccess: async () => {
          toast.success("Icon removed successfully");
          setOpened(false);
          deleteUploadedFiles({ fileKeyArray: [{ Key: oldIcon }] });
        },
        onError: (error) => {
          toast.error(error?.message || "Error removing icon");
        },
      },
    );
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="border-0 shadow-2xl max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4">
            <Folder className="w-7 h-7 text-rateup-orange" />
          </div>
          <DialogTitle className="text-2xl">Edit Group Icon</DialogTitle>
          <DialogDescription className="text-base">
            Upload a custom icon for your group or remove the existing one
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          {/* Current Icon Preview */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 rounded-2xl bg-linear-to-br from-rateup-orange via-orange-400 to-rateup-orange/80 flex items-center justify-center shadow-lg ring-4 ring-orange-100 overflow-hidden">
              {group?.icon ? (
                <Image
                  src={getFileUrlFromKey(group?.icon)}
                  alt={group?.name}
                  className="w-full h-full object-cover"
                  width={200}
                  height={200}
                />
              ) : (
                <span className="text-white text-4xl">{getInitials(group?.name)}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 gap-3 bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700"
            >
              <Upload className="w-5 h-5" />
              Upload New Icon
            </Button>
            {group?.icon && (
              <Button
                variant="outline"
                onClick={handleRemoveIcon}
                className="w-full h-12 gap-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
              >
                <X className="w-5 h-5" />
                Remove Icon
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Recommended: Square image, at least 200x200 pixels
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpened(false)} className="h-10">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
