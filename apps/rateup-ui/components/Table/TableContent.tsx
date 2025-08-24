"use no memo";

import React from "react";
import { useRouter } from "next/navigation";

import {
  Box,
  Center,
  Divider,
  Flex,
  Group,
  HoverCard,
  Pagination,
  rem,
  ScrollArea,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";
import { flexRender, Header, Table as TableType } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { PAGE_SIZE } from "../../utils/constants";
import {
  TableBodySkeleton,
  TableHeadSkeleton,
} from "../animation/skeleton/Table.Skeleton";
import { DETAIL_BTN } from "../Contacts/utils/utils";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { Filter } from "./Filter/Filter";
import styles from "./TableContent.module.css";

type TableLayoutProps = {
  table: TableType<any>;
  enableFilter: boolean;
  filterVisibility: boolean;
  tempVisibleColumnArray: string[];
  enablePagination: boolean;
  detailBtn?: boolean;
  isPending?: boolean;
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
const renderHeader = (header) => {
  const headerText = flexRender(
    header.column.columnDef.header,
    header.getContext(),
  );

  if (String(headerText).length <= 50) {
    return (
      <Text miw={200} maw={200} fw={"bold"}>
        {headerText}
      </Text>
    );
  }

  return (
    <HoverCard
      width={"fit-content"}
      shadow="md"
      withArrow
      styles={{ dropdown: { maxWidth: 400 } }}
      position="bottom-start"
    >
      <HoverCard.Target>
        {/* <span className="truncated-header">{headerText}</span> */}
        <Text miw={200} maw={200} lineClamp={1} fw={"bold"}>
          {headerText}
        </Text>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <div style={{ wordWrap: "break-word", maxWidth: "100%" }}>
          {headerText}
        </div>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};
const TableLayout = ({
  table,
  enableFilter,
  filterVisibility,
  tempVisibleColumnArray,
  enablePagination,
  detailBtn,
  isPending,
}: TableLayoutProps) => {
  const router = useRouter();
  const translations = useTranslations();
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
              {isPending ? (
                <TableHeadSkeleton />
              ) : (
                table.getHeaderGroups().map((headerGroup) => (
                  <Table.Tr key={headerGroup.id} className="table-header">
                    {headerGroup.headers.map((header) => {
                      const extendedHeader = header as ExtendedHeader;
                      return (
                        <Table.Th
                          key={header.id}
                          colSpan={header.colSpan}
                          style={
                            header.getSize() === 10
                              ? { maxWidth: `50px` }
                              : { width: `${header.getSize()}px` }
                          }
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
                                <Flex
                                  justify="space-between"
                                  gap={"md"}
                                  w={"100%"}
                                >
                                  {renderHeader(header)}
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
                ))
              )}
            </Table.Thead>

            <Table.Tbody className="table-body">
              {isPending ? (
                <TableBodySkeleton />
              ) : table.getRowModel().rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={tempVisibleColumnArray?.length}>
                    <Text ta="center">Nothing found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <Table.Tr
                    key={row.id}
                    className={detailBtn && styles["table-body-row"]}
                    onClick={() => {
                      let routeUrl: string | null =
                        detailBtn && row.getValue(DETAIL_BTN);
                      if (routeUrl) router.push(routeUrl);
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
              total={isPending ? 0 : table.getPageCount()}
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
                  <Pagination.Next
                    disabled={isPending ? true : !table.getCanNextPage()}
                  />
                  <Pagination.Last
                    disabled={isPending ? true : !table.getCanNextPage()}
                  />
                </Group>
              </ScrollArea>
            </Pagination.Root>
          )}
          <Group className={styles["rows-per-page-text-dd-container"]}>
            <Text fz="sm">{translations("Rows Per page")}</Text>
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
        <Text className="pagination-total-rows-text" pr={"xs"} fw={600}>
          {translations("Total Rows: ")}
          {(isPending ? 0 : table.getRowCount()) ?? 0}
        </Text>
      </Flex>
    </Stack>
  );
};

export default TableLayout;
