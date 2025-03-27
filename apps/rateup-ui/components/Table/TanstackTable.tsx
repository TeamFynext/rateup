import React, { useCallback, useEffect, useMemo } from "react";

import { Box, Divider, Flex, Group } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { docsPath, PAGE_SIZE } from "../../utils/constants";
import InfoButton from "../Button/InfoButton";
import { RateupButtonBlue } from "../Button/RateupButtons";
import RefreshButton from "../Button/RefreshButton";
import { DETAIL_BTN } from "../Contacts/utils/utils";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import { fuzzyFilter } from "../Survey/Response/Filter";
import FilterToggles from "./Filter/FilterToggle";
import TableLayout from "./TableContent";
import styles from "./TanstackTable.module.css";

function TanstackTable({
  className,
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
  btnTitle,
  toggle,
  disableFuzzyFnCustom = false,
  toggleOffContent = <></>,
  detailBtn = false,
  isPending = false,
  columnFiltersE,
  setColumnFiltersE,
  pagination,
  setPagination,
  totalCount,
}: Readonly<{
  className?: string;
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
  handleDeletion?: (seletedId: string[]) => void;
  btnTitle?: string;
  toggle?: () => void;
  toggleOffContent?: React.ReactNode;
  disableFuzzyFnCustom?: boolean;
  detailBtn?: boolean;
  isPending?: boolean;
  columnFiltersE?: ColumnFiltersState;
  setColumnFiltersE?: (newFilters: ColumnFiltersState) => void;
  pagination?: any;
  setPagination?: (pagination) => void;
  totalCount?: number;
}>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = React.useState({
    [DETAIL_BTN]: false,
  });
  const largeScreen = useMediaQuery("(min-width: 40em)") || true;
  const [filterVisibility, setFilterVisibility] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  let tempVisibleColumnArray: string[] = useMemo(() => [], []);
  useEffect(() => {
    if (tempVisibleColumnArray)
      useVisibleColumnStore
        .getState()
        .updateVisibleColumnArray(tempVisibleColumnArray);
  }, [tempVisibleColumnArray]);

  const handleSortingChange = useCallback((newSorting) => {
    setSorting(newSorting);
  }, []);

  const handleColumnFiltersChange = useCallback((newFilters) => {
    if (columnFiltersE) {
      setColumnFiltersE(newFilters);
    } else {
      setColumnFilters(newFilters);
    }
  }, []);

  const handleColumnVisibilityChange = useCallback((newVisibility) => {
    setColumnVisibility(newVisibility);
  }, []);

  const handleRowSelectionChange = useCallback((newSelection) => {
    setRowSelection(newSelection);
  }, []);

  const table = useReactTable({
    data,
    columns,
    ...(disableFuzzyFnCustom ? {} : { filterFns: { fuzzy: fuzzyFilter } }),
    state: {
      columnVisibility,
      sorting,
      columnFilters: columnFiltersE || columnFilters,
      rowSelection,
      ...(pagination ? { pagination } : {}),
    },
    initialState: {
      ...(pagination
        ? { pagination }
        : {
            pagination: {
              pageSize: Number(PAGE_SIZE[0]),
            },
          }),
    },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: handleColumnFiltersChange,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    ...(pagination ? { onPaginationChange: setPagination } : {}),
    manualPagination: !!pagination,
    manualSorting: !!pagination,
    manualFiltering: !!pagination,
    rowCount: totalCount,
    autoResetPageIndex: !pagination,
  });

  return (
    <Box className={`${styles["tanstack-table-root-div"]} ${className}`}>
      <Flex
        className={styles["filter-and-other-btns-container"]}
        gap={"md"}
        justify={"space-between"}
        px={"xs"}
        direction={largeScreen ? "row" : "column"}
      >
        <Group mr={"auto"}>
          {toggle ? (
            <Flex gap={"sm"} align={"center"}>
              <RateupButtonBlue
                className={"create-btn"}
                title={btnTitle}
                rightIcon={<IconPlus />}
                onClick={toggle}
              />
              <RefreshButton queryKeys={["campaigns"]} />
              <InfoButton docUrl={`${docsPath}/whatsappSurvey/campaign`} />
            </Flex>
          ) : (
            <Box
              className={`${styles["empty-div-for-table-without-create-btn"]} empty-div-for-table-without-create-btn`}
              w={!toggleOffContent ? 50 : "auto"}
              h={!toggleOffContent ? 50 : "auto"}
            >
              {toggleOffContent}
            </Box>
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
      <Divider />
      <TableLayout
        enableFilter={enableFilter}
        enablePagination={enablePagination}
        filterVisibility={filterVisibility}
        table={table}
        tempVisibleColumnArray={tempVisibleColumnArray}
        detailBtn={detailBtn}
        isPending={isPending}
      />
    </Box>
  );
}

export default React.memo(TanstackTable);
