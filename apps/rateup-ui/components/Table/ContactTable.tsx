import { ActionIcon, Flex, Group, ThemeIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useEffect } from "react";
import { useDeleteManyContactsMutation } from "../../backend/campaign/contacts/contacts.query";
import { PAGE_SIZE } from "../../utils/constants";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import ConfirmationModal from "../Modal/ConfirmationModal";
import FilterToggles from "./Filter/FilterToggle";
import TableLayout from "./TableContent";
import { showLoadingToast } from "../../utils/notifications";
import OpenCreateMenu from "../Contacts/OpenCreateMenu";
import { ContactTabs } from "../../pages/dashboard/contacts";
import {
  useDeleteManyContactGroupsMutation,
  useRemoveContactsFromGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";

function ContactTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  cTags = [],
  topHeight,
  tab = ContactTabs.CONTACTS,
  open = () => {},
  groupId = "",
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  cTags: string[];
  topHeight?: number;
  tab?: string;
  open?: () => void;
  groupId?: string;
}>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [filterVisibility, setFilterVisibility] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const deleteManyContactsMutation = useDeleteManyContactsMutation(() => {
    setRowSelection({});
  });
  const deleteManyContactGroupsMutation = useDeleteManyContactGroupsMutation(
    () => {
      setRowSelection({});
    },
  );
  const removeContactsMutation = useRemoveContactsFromGroup(groupId, () => {
    setRowSelection({});
  });

  let tempVisibleColumnArray: string[] = [];

  useEffect(() => {
    if (tempVisibleColumnArray)
      useVisibleColumnStore
        .getState()
        .updateVisibleColumnArray(tempVisibleColumnArray);
  }, [tempVisibleColumnArray]);

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: Number(PAGE_SIZE[0]),
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });
  let headerLabel = "Are you sure to delete these selected contacts?";
  if (tab === ContactTabs.GROUPS)
    headerLabel = "Are you sure to delete these selected contact groups?";
  if (tab === "member")
    headerLabel = "Are you sure to remove these selected members?";

  let headerTitle = "Delete Contacts?";
  if (tab === ContactTabs.GROUPS) headerTitle = "Delete Contact Groups?";
  if (tab === "member") headerTitle = "Remove members?";
  let tooltipMsg = "delete contacts";
  if (tab === ContactTabs.GROUPS) tooltipMsg = "delete contact groups";
  else if (tab === "member") tooltipMsg = "remove members";

  return (
    <>
      <Flex gap={"md"} justify={"space-between"} align={"center"} px={"xs"}>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel={headerLabel}
          headerTitle={headerTitle}
          confirmLabel="Delete"
          onConfirm={() => {
            switch (tab) {
              case ContactTabs.CONTACTS:
                showLoadingToast(
                  "Contacts getting deleted",
                  "contact-delete",
                  true,
                  "Deleting Contacts",
                );
                deleteManyContactsMutation?.mutate(
                  Object.keys(rowSelection)?.map(
                    (index) => data?.[parseInt(index)]?.id,
                  ),
                );
                break;
              case ContactTabs.GROUPS:
                showLoadingToast(
                  "Contact groups getting deleted",
                  "contact-group-delete",
                  true,
                  "Deleting Contact Groups",
                );
                deleteManyContactGroupsMutation.mutate(
                  Object.keys(rowSelection)?.map(
                    (index) => data?.[parseInt(index)]?.id,
                  ),
                );
                break;
              case "member":
                showLoadingToast(
                  "Members getting removed",
                  "contact-group-remove",
                  true,
                  "Removing Members",
                );
                removeContactsMutation.mutate({
                  contactIds: Object.keys(rowSelection)?.map(
                    (index) => data?.[parseInt(index)]?.id,
                  ),
                  groupId,
                });
                break;
              default:
                break;
            }
          }}
        />
        <Group gap={"xl"}>
          {Object.keys(rowSelection)?.length > 0 ? (
            <Tooltip label={`Click to ${tooltipMsg}`} onClick={toggle}>
              <ActionIcon variant="light">
                <IconTrash />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label={"Select an item to delete"}>
              <ActionIcon variant="light" disabled>
                <IconTrash />
              </ActionIcon>
            </Tooltip>
          )}
          <OpenCreateMenu tags={cTags ?? []} tab={tab} toggle={open} />
        </Group>
        <ThemeIcon size="sm" w={"max-content"} variant="light" p={"xs"}>
          Count: {data?.length ?? 0}
        </ThemeIcon>
        <FilterToggles
          enableFilter={enableFilter}
          filterVisibility={filterVisibility}
          table={table}
          tempVisibleColumnArray={tempVisibleColumnArray}
          enableColumnSelection={enableColumnSelection}
          setFilterVisibility={setFilterVisibility}
        />
      </Flex>
      <TableLayout
        enableFilter={enableFilter}
        enablePagination={enablePagination}
        filterVisibility={filterVisibility}
        table={table}
        tempVisibleColumnArray={tempVisibleColumnArray}
        topHeight={topHeight}
      />
    </>
  );
}
export default ContactTable;
