import React from "react";
import {
  Stack,
  Table,
  UnstyledButton,
  Flex,
  Center,
  rem,
  Pagination,
  Group,
  Box,
  Text,
  Divider,
  ScrollArea,
} from "@mantine/core";
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react";
import { Header, Table as TableType, flexRender } from "@tanstack/react-table";
import { PAGE_SIZE } from "../../utils/constants";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { Filter } from "./Filter/Filter";
import { lexend600 } from "../../utils/fonts";
import styles from "./TableContent.module.css";
import { useRouter } from "next/router";
import { DETAIL_BTN } from "../Contacts/utils/utils";

type TableLayoutProps = {
  table: TableType<any>;
  enableFilter: boolean;
  filterVisibility: boolean;
  tempVisibleColumnArray: string[];
  enablePagination: boolean;
  topHeight: number;
};

// Extend the Header to use the new ExtendedColumnMeta
type ExtendedHeader = Header<any, unknown> & {
  column: {
    columnDef: {
      meta: {
        filterComponent?: (
          setFilterValue: (value: any) => void,
        ) => React.ReactNode;
      };
    };
  };
};
const TableLayout = ({
  table,
  enableFilter,
  filterVisibility,
  tempVisibleColumnArray,
  enablePagination,
  topHeight = 420,
}: TableLayoutProps) => {
  const router = useRouter();
  return (
    <Stack className={styles["table-and-pagination-container"]}>
      <Stack justify="space-between" className={styles["table-container"]}>
        <ScrollArea
          w={"100%"}
          h={"100%"}
          classNames={{ scrollbar: styles["table-scrollbar"] }}
        >
          <Table stickyHeader striped highlightOnHover>
            <Table.Thead bg={"light-dark(white,var(--mantine-color-dark-6))"}>
              {table.getHeaderGroups().map((headerGroup, index) => (
                <Table.Tr key={index} className="table-header">
                  {headerGroup.headers.map((header, headerIndex) => {
                    const extendedHeader = header as ExtendedHeader;
                    return (
                      <Table.Th
                        key={headerIndex}
                        colSpan={header.colSpan}
                        style={{ width: `${header.getSize()}px` }}
                      >
                        {header.isPlaceholder ? null : (
                          <>
                            <UnstyledButton
                              className={styles["th-button"]}
                              {...{
                                onClick:
                                  header.column.getToggleSortingHandler(),
                              }}
                            >
                              <Flex justify="space-between" gap={"md"}>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {header.column.getCanSort() && (
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
                                    }[
                                      header.column.getIsSorted() as string
                                    ] ?? (
                                      <IconSelector
                                        style={{
                                          width: rem(16),
                                          height: rem(16),
                                        }}
                                        stroke={1.5}
                                      />
                                    )}
                                  </Center>
                                )}
                              </Flex>
                            </UnstyledButton>
                            {enableFilter &&
                            filterVisibility &&
                            header.column.getCanFilter() ? (
                              <>
                                {extendedHeader.column.columnDef?.meta?.filterComponent(
                                  header.column.setFilterValue,
                                ) ?? (
                                  <Filter
                                    column={header.column}
                                    table={table}
                                  />
                                )}
                              </>
                            ) : (
                              filterVisibility && <Box h={"36px"} />
                            )}
                          </>
                        )}
                      </Table.Th>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Thead>

            <Table.Tbody className="table-body">
              {table.getRowModel().rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={tempVisibleColumnArray?.length}>
                    <Text ta="center">Nothing found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <Table.Tr
                    key={index}
                    className={
                      row.getValue(DETAIL_BTN) && styles["table-body-row"]
                    }
                    onClick={() => {
                      let detailBtn = row.getValue(DETAIL_BTN);
                      if (detailBtn) router.push(detailBtn);
                    }}
                  >
                    {row.getVisibleCells().map((cell, indexCell) => (
                      <Table.Td
                        className={styles["table-td"]}
                        key={indexCell}
                        bg={row.getIsSelected() ? "var(--shade-of-blue-7)" : ""}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
            <Table.Tfoot>
              {table.getFooterGroups().map((footerGroup, index) => (
                <Table.Tr key={index}>
                  {footerGroup.headers.map((header, HIndex) => (
                    <Table.Th key={HIndex}>
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
        </ScrollArea>
      </Stack>
      <Divider />
      <Flex
        className={styles["pagination-container"]}
        gap={"xl"}
        justify={"space-between"}
        align={"center"}
      >
        <Group className={styles["pagination-rows-per-page-dd-container"]}>
          {enablePagination && (
            <Pagination.Root
              className={styles["mantine-pagination-root-div"]}
              style={{ overflow: "hidden" }}
              size={"sm"}
              total={table.getPageCount()}
              onChange={(e) => table.setPageIndex(e - 1)}
              boundaries={1}
              siblings={1}
            >
              <ScrollArea w={"100%"} type="never">
                <Group
                  className={styles["pagination-next-prev-page-btns-container"]}
                >
                  <Pagination.First disabled={!table.getCanPreviousPage()} />
                  <Pagination.Previous disabled={!table.getCanPreviousPage()} />
                  <Pagination.Items />
                  <Pagination.Next disabled={!table.getCanNextPage()} />
                  <Pagination.Last disabled={!table.getCanNextPage()} />
                </Group>
              </ScrollArea>
            </Pagination.Root>
          )}
          <Group className={styles["rows-per-page-text-dd-container"]}>
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
                  width: 80,
                },
              }}
            />
          </Group>
        </Group>
        <Text
          className="pagination-total-rows-text"
          pr={"xs"}
          ff={lexend600.style.fontFamily}
        >
          Total Rows: {table.getRowCount() ?? 0}
        </Text>
      </Flex>
    </Stack>
  );
};

export default TableLayout;
