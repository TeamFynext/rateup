import { ScrollAreaAutosize, Table } from "@mantine/core";

const TableLayoutSecondary = ({
  columns,
  rows,
  maxHeight,
}: {
  columns: Array<{
    key: string;
    value: string;
    renderCell?: (value) => JSX.Element;
  }>;
  rows: Array<any>;
  maxHeight?: string | number;
}) => {
  return (
    <ScrollAreaAutosize mah={maxHeight}>
      <Table highlightOnHover stickyHeader striped verticalSpacing={"md"}>
        <Table.Thead>
          <Table.Tr>
            {columns.map((column) => (
              <Table.Th key={column.key}>{column.value}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!rows?.length ? (
            <Table.Tr>
              <Table.Td colSpan={9} align="center">
                Nothing Found
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
