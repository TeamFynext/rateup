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
} from "@mantine/core";
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react";
import { flexRender } from "@tanstack/react-table";
import { PAGE_SIZE } from "../../utils/constants";
import { ContainedSelection } from "../input/ContainedInput/ContainedInput";
import { Filter } from "./Filter/Filter";
import { lexend600 } from "../../utils/fonts";

const TableLayout = ({
  table,
  enableFilter,
  filterVisibility,
  tempVisibleColumnArray,
  enablePagination,
  topHeight = 410,
}) => {
  return (
    <>
      <Stack justify="space-between" h={`calc(100dvh - ${topHeight}px`}>
        <Table.ScrollContainer minWidth={500} type="native" mt={4}>
          <Table stickyHeader striped highlightOnHover>
            <Table.Thead>
              {table.getHeaderGroups().map((headerGroup, index) => (
                <Table.Tr key={index}>
                  {headerGroup.headers.map((header, headerIndex) => (
                    <Table.Th key={headerIndex} colSpan={header.colSpan}>
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
                                  }[header.column.getIsSorted() as string] ?? (
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
              {table.getRowModel().rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={tempVisibleColumnArray?.length}>
                    <Text ta="center">Nothing found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <Table.Tr key={index}>
                    {row.getVisibleCells().map((cell, indexCell) => (
                      <Table.Td
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
        </Table.ScrollContainer>
      </Stack>
      <Flex
        gap={"xl"}
        pt={"xs"}
        px={"xs"}
        justify={"space-between"}
        align={"center"}
      >
        <Group>
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
                  width: 80,
                },
              }}
            />
          </Group>
        </Group>
        <Text pr={"xs"} ff={lexend600.style.fontFamily}>
          Total Rows: {table.getFilteredRowModel()?.flatRows?.length ?? 0}
        </Text>
      </Flex>
    </>
  );
};

export default TableLayout;
