import {
  ActionIcon,
  Box,
  Center,
  Checkbox,
  Flex,
  Group,
  Pagination,
  Popover,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
  rem,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconSelector,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { useEffect } from "react";
import { RateupButtonSecondary } from "../Button/RateupButtons";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { Filter } from "./Filter/Filter";
import { fuzzyFilter } from "../Survey/Response/Filter";
import { PAGE_SIZE } from "../../utils/constants";
import { useVisibleColumnStore } from "../HomePage/pages/Pricing/store/RouteAndCartStore";
import styles from "./TanstackTable.module.css";

function TanstackTable({
  data,
  columns,
  enableFilter = true,
  enablePagination = true,
  enableColumnSelection = true,
}: Readonly<{
  data: any;
  columns: ColumnDef<any, any>[];
  enableFilter?: boolean;
  enablePagination?: boolean;
  enableColumnSelection?: boolean;
}>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [filterVisibility, setFilterVisibility] = React.useState(false);
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
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    state: {
      columnVisibility,
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <>
      <Flex
        gap={"md"}
        justify={"end"}
        align={"center"}
        className={"actions-container"}
      >
        {enableFilter && (
          <ActionIcon
            onClick={() => setFilterVisibility((el) => !el)}
            variant={filterVisibility ? "filled" : "outline"}
          >
            <IconFilter
              style={{ width: rem(16), height: rem(16) }}
              stroke={1.5}
            />
          </ActionIcon>
        )}
        {enableColumnSelection && (
          <Popover
            width={200}
            position="bottom"
            withArrow
            shadow="md"
            offset={2}
          >
            <Popover.Target>
              <Box>
                <RateupButtonSecondary title="Select Fields" />
              </Box>
            </Popover.Target>
            <Popover.Dropdown>
              <ScrollArea.Autosize mah={"200px"}>
                <Flex align={"center"}>
                  <Checkbox
                    {...{
                      type: "checkbox",
                      checked: table.getIsAllColumnsVisible(),
                      onChange: table.getToggleAllColumnsVisibilityHandler(),
                    }}
                    label={"Toggle All"}
                  />
                </Flex>
                {table.getAllLeafColumns().map((column) => {
                  if (column.getIsVisible())
                    tempVisibleColumnArray.push(column?.id?.split("_,_")?.[0]);
                  return (
                    <Flex key={column.id} mt={4} align={"center"}>
                      <Checkbox
                        {...{
                          type: "checkbox",
                          checked: column.getIsVisible(),
                          onChange: column.getToggleVisibilityHandler(),
                        }}
                        label={column?.id?.split("_,_")?.[0]}
                      />
                    </Flex>
                  );
                })}
              </ScrollArea.Autosize>
            </Popover.Dropdown>
          </Popover>
        )}
        {enableFilter && (
          <Tooltip label="Clear the filtered values">
            <RateupButtonSecondary
              onClick={() => table.resetColumnFilters()}
              title="Reset"
            />
          </Tooltip>
        )}
      </Flex>
      <ScrollArea scrollbarSize={"0.625rem"}>
        <Stack justify="space-between" mih={"min(60dvh,440px)"}>
          <Table withRowBorders>
            <Table.Thead className={styles["table-thead"]}>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Table.Th key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : (
                        <>
                          <UnstyledButton
                            {...{
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                            fz={"md"}
                            w={"max-content"}
                          >
                            <Flex justify="space-between" gap={"md"}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              <Center>
                                {{
                                  asc: (
                                    <IconChevronUp
                                      style={{
                                        width: rem(16),
                                        height: rem(16),
                                      }}
                                      stroke={1.5}
                                    />
                                  ),
                                  desc: (
                                    <IconChevronDown
                                      style={{
                                        width: rem(16),
                                        height: rem(16),
                                      }}
                                      stroke={1.5}
                                    />
                                  ),
                                }[header.column.getIsSorted() as string] ?? (
                                  <IconSelector
                                    style={{ width: rem(16), height: rem(16) }}
                                    stroke={1.5}
                                  />
                                )}
                              </Center>
                            </Flex>
                          </UnstyledButton>
                          {enableFilter &&
                          filterVisibility &&
                          header.column.getCanFilter() ? (
                            <>
                              <Filter column={header.column} table={table} />
                            </>
                          ) : (
                            filterVisibility && <Box h={"36px"} />
                          )}
                        </>
                      )}
                    </Table.Th>
                  ))}
                </Table.Tr>
              ))}
            </Table.Thead>
            <Table.Tbody>
              {table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
            <Table.Tfoot>
              {table.getFooterGroups().map((footerGroup) => (
                <Table.Tr key={footerGroup.id}>
                  {footerGroup.headers.map((header) => (
                    <Table.Th key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext(),
                          )}
                    </Table.Th>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tfoot>
          </Table>
        </Stack>
      </ScrollArea>
      <Flex gap={"xl"} className={"pagination-container"}>
        {enablePagination && (
          <Pagination.Root
            total={table.getPageCount()}
            onChange={(e) => table.setPageIndex(e - 1)}
          >
            <Group gap={5} justify="center">
              <Pagination.First disabled={!table.getCanPreviousPage()} />
              <Pagination.Previous disabled={!table.getCanPreviousPage()} />
              <Pagination.Items />
              <Pagination.Next disabled={!table.getCanNextPage()} />
              <Pagination.Last disabled={!table.getCanNextPage()} />
            </Group>
          </Pagination.Root>
        )}
        <Group>
          <Text fz="sm">Rows Per page</Text>
          <ContainedSelection
            onChange={(value) => {
              table.setPageSize(Number(value));
            }}
            value={String(table.getState().pagination.pageSize)}
            data={PAGE_SIZE}
            allowDeselect={false}
            styles={{
              input: {
                height: 10,
                width: 70,
              },
            }}
          />
        </Group>
      </Flex>
    </>
  );
}
export default TanstackTable;
