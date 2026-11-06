import { useTranslation } from "react-i18next";

import {
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";

export function ListToolbar({
  search,
  onSearch,
  sort,
  onSort,
  placeholder,
  shown,
  total,
}: Readonly<{
  search: string;
  onSearch: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  placeholder: string;
  shown: number;
  total: number;
}>) {
  const { t } = useTranslation();
  const sortOptions = [
    { value: "latest", label: t("Newest") },
    { value: "oldest", label: t("Oldest") },
    { value: "a-z", label: t("Name (A-Z)") },
    { value: "z-a", label: t("Name (Z-A)") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ListPageSearchInput
        className="w-full sm:w-72"
        placeholder={placeholder}
        value={search}
        onChange={onSearch}
      />
      <ListPageSortDropdown options={sortOptions} value={sort} onChange={onSort} />
      {shown !== total && (
        <span className="text-sm text-muted-foreground">
          {t("{shown} of {total}", { shown, total })}
        </span>
      )}
    </div>
  );
}
