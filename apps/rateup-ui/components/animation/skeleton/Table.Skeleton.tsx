"use client";

import React from "react";

import { Skeleton, Table } from "@mantine/core";

import useTableLoadingDataCount from "../../../hooks/useTableLoadingDataCount";

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
    <Table.Tr>
      {columns.map((_, i) => (
        <Table.Th key={i}>
          <Skeleton
            height={30}
            maw={i === 0 ? "30%" : "80%"}
            miw={i === 0 ? 30 : 80}
          />
        </Table.Th>
      ))}
    </Table.Tr>
  );
};
export const TableBodySkeleton = () => {
  const count = useTableLoadingDataCount();
  return (
    <>
      {Array.from({ length: count }).map((_, rowIndex) => (
        <Table.Tr key={rowIndex}>
          {columns.map((_, i) => (
            <Table.Td key={i}>
              <Skeleton
                height={30}
                maw={i === 0 ? "30%" : "100%"}
                miw={i === 0 ? 30 : 100}
              />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
};
