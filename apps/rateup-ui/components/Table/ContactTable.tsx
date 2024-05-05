import { ActionIcon, Flex, Group, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash } from "@tabler/icons-react";
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
import {
  useDeleteManyContactGroupsMutation,
  useRemoveContactsFromGroup,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { useDeleteManyContactsMutation } from "../../backend/campaign/contacts/contacts.query";
import { PAGE_SIZE } from "../../utils/constants";
import { showLoadingToast } from "../../utils/notifications";
import { RateupButtonBlue } from "../Button/RateupButtons";
import OpenCreateMenu from "../Contacts/OpenCreateMenu";
import { WhatsappTableType, tabHeaderLabels } from "../Contacts/utils/utils";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import ConfirmationModal from "../Modal/ConfirmationModal";
import FilterToggles from "./Filter/FilterToggle";
import TableLayout from "./TableContent";
import { useRemoveMulitpleGroupParticipants } from "../../backend/campaign/campaignParticipants/campaignParticipants.query";

function ContactTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  cTags = [],
  topHeight,
  tab = WhatsappTableType.CONTACTS,
  open = () => {},
  groupId = "",
  btnTitle = "",
  toggle,
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  cTags?: string[];
  topHeight?: number;
  tab?: string;
  open?: () => void;
  groupId?: string;
  btnTitle?: string;
  toggle?: () => void;
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
  const [
    dialogOpened,
    { toggle: toggleConfirmationModal, close: closeDialog },
  ] = useDisclosure(false);
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
  const removeMulitpleGroupParticipants = useRemoveMulitpleGroupParticipants(
    groupId,
    () => {
      setRowSelection({});
    },
  );

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
  const { headerLabel, headerTitle, tooltipMsg } = tabHeaderLabels[tab] || {};

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
            const selectedIds = Object.keys(rowSelection)?.map(
              (index) => data?.[parseInt(index)]?.id,
            );
            switch (tab) {
              case WhatsappTableType.CONTACTS:
                showLoadingToast(
                  "Contacts getting deleted",
                  "contact-delete",
                  true,
                  "Deleting Contacts",
                );
                deleteManyContactsMutation?.mutate(selectedIds);
                break;
              case WhatsappTableType.GROUPS:
                showLoadingToast(
                  "Contact groups getting deleted",
                  "contact-group-delete",
                  true,
                  "Deleting Contact Groups",
                );
                deleteManyContactGroupsMutation.mutate(selectedIds);
                break;
              case WhatsappTableType.MEMBERS:
                showLoadingToast(
                  "Members getting removed",
                  "contact-group-remove",
                  true,
                  "Removing Members",
                );
                removeContactsMutation.mutate({
                  contactIds: selectedIds,
                  groupId,
                });
                break;
              case WhatsappTableType.PARTICIPANTS:
                showLoadingToast(
                  "Participants getting removed",
                  "campaign-mulitiple-participants-remove",
                  true,
                  "Removing Participants",
                );
                removeMulitpleGroupParticipants.mutate({
                  data: selectedIds,
                  campaignId: groupId,
                });
                break;
              default:
                break;
            }
          }}
        />
        <Group gap={"xl"}>
          {Object.keys(rowSelection)?.length > 0 ? (
            <Tooltip
              label={`Click to ${tooltipMsg}`}
              onClick={toggleConfirmationModal}
            >
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
          {toggle ? (
            <RateupButtonBlue
              title={btnTitle}
              rightIcon={<IconPlus />}
              onClick={toggle}
            />
          ) : (
            <OpenCreateMenu tags={cTags ?? []} tab={tab} toggle={open} />
          )}
        </Group>
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
