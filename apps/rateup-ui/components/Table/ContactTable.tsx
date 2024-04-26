import { ActionIcon, Flex, Group, Tooltip } from "@mantine/core";
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

function ContactTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  cTags = [],
  topHeight,
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  cTags: string[];
  topHeight?: number;
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

  return (
    <>
      <Flex gap={"md"} justify={"space-between"} align={"center"} px={"xs"}>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel="Are you sure to delete these selected contacts?"
          headerTitle="Delete Contacts?"
          confirmLabel="Delete"
          onConfirm={() => {
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
          }}
        />
        <Group gap={"xl"}>
          {Object.keys(rowSelection)?.length > 0 ? (
            <Tooltip label={"Click to delete contacts"} onClick={toggle}>
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
          <OpenCreateMenu tags={cTags ?? []} />
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
