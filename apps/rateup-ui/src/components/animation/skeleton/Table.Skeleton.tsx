import { Skeleton } from "@mantine/core";
import React from "react";

import { TableCell, TableHead, TableRow } from "@/components/ui/table.tsx";
import useTableLoadingDataCount from "@/hooks/useTableLoadingDataCount.tsx";

const columns = [
  { Header: "Column 1", accessor: "col1" },
  { Header: "Column 2", accessor: "col2" },
  { Header: "Column 3", accessor: "col3" },
  { Header: "Column 4", accessor: "col4" },
  { Header: "Column 5", accessor: "col5" },
  { Header: "Column 6", accessor: "col6" },
  { Header: "Column 7", accessor: "col7" },
  { Header: "Column 8", accessor: "col8" },
];

export const TableHeadSkeleton = () => {
  return (
    <TableRow>
      {columns.map((_, i) => (
        <TableHead key={i}>
          <Skeleton height={30} maw={i === 0 ? "30%" : "80%"} miw={i === 0 ? 30 : 80} />
        </TableHead>
      ))}
    </TableRow>
  );
};
export const TableBodySkeleton = () => {
  const count = useTableLoadingDataCount();
  return (
    <>
      {Array.from({ length: count }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((_, i) => (
            <TableCell key={i}>
              <Skeleton height={30} maw={i === 0 ? "30%" : "100%"} miw={i === 0 ? 30 : 100} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};
