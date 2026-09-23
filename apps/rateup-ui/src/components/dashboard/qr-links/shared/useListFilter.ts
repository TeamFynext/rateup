import { useState } from "react";

import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";

/** Name search plus the shared sort, over rows that carry `name` and `createdAt`. */
export function useListFilter<T extends { name: string; createdAt: string }>(rows: readonly T[]) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const query = useDebounce(search.trim().toLowerCase(), 200);

  const visible = sortData(
    rows.filter((row) => !query || row.name.toLowerCase().includes(query)),
    sort,
  );

  return { search, setSearch, sort, setSort, visible };
}
