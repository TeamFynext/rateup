import React, { useEffect } from "react";
import { Box, Flex } from "@mantine/core";
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
import { PAGE_SIZE } from "../../utils/constants";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import { fuzzyFilter } from "../Survey/Response/Filter";
import FilterToggles from "./Filter/FilterToggle";
import TableLayout from "./TableContent";
import { RateupButtonBlue } from "../Button/RateupButtons";
import { IconPlus } from "@tabler/icons-react";

function TanstackTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  topHeight,
  btnTitle,
  toggle,
  disableFuzzyFnCustom = false,
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  handleDeletion?: (seletedId: string[]) => void;
  topHeight?: number;
  btnTitle?: string;
  toggle?: () => void;
  disableFuzzyFnCustom?: boolean;
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
    ...(disableFuzzyFnCustom ? {} : { filterFns: { fuzzy: fuzzyFilter } }),
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
        {toggle ? (
          <RateupButtonBlue
            title={btnTitle}
            rightIcon={<IconPlus />}
            onClick={toggle}
          />
        ) : (
          <Box w={50} h={50} />
        )}
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
export default TanstackTable;
