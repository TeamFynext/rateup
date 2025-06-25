import { JSX } from "react";

import { ScrollAreaAutosize, Table } from "@mantine/core";

import useTranslations from "@/dictionaries/useTranslation";

const TableLayoutSecondary = ({
  columns,
  rows,
  maxHeight,
  minHeight,
  headerStyle,
}: {
  columns: Array<{
    key: string;
    value: string;
    renderCell?: (value) => JSX.Element;
    width?: string | number;
  }>;
  rows: Array<any>;
  maxHeight?: string | number;
  minHeight?: string | number;
  headerStyle?: any;
}) => {
  const { translations } = useTranslations();
  return (
    <ScrollAreaAutosize mah={maxHeight} mih={minHeight}>
      <Table highlightOnHover stickyHeader striped verticalSpacing={"md"}>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th w={column.width} key={column.key} style={headerStyle}>
                {column.value}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!rows?.length ? (
            <Table.Tr>
              <Table.Td colSpan={9} align="center">
                {translations["Nothing Found"]}
              </Table.Td>
            </Table.Tr>
          ) : (
            rows.map((row, index) => (
              <Table.Tr key={index}>
                {columns.map((column) => {
                  const renderCell = column.renderCell;
                  return (
                    <Table.Td key={column.key}>
                      {renderCell
                        ? renderCell(row[column.key])
                        : row[column.key]}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </ScrollAreaAutosize>
  );
};

export default TableLayoutSecondary;
