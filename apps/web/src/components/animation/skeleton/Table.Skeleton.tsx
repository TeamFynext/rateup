import { Skeleton } from "@/components/ui/skeleton.tsx";
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
          <Skeleton
            className={i === 0 ? "h-7.5 max-w-[30%] min-w-7.5" : "h-7.5 max-w-[80%] min-w-20"}
          />
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
              <Skeleton
                className={i === 0 ? "h-7.5 max-w-[30%] min-w-7.5" : "h-7.5 w-full min-w-25"}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};
