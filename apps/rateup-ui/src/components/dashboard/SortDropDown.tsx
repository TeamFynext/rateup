import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";

const SortDropdown = ({
  onSortChange,
  defaultSortOption = "latest",
}: {
  onSortChange: (value: string) => void;
  defaultSortOption?: string;
}) => {
  const [sortOption, setSortOption] = useState(defaultSortOption);
  const { t: translations } = useTranslation();
  const handleSortChange = (value: string) => {
    setSortOption(value);
    onSortChange(value);
  };

  return (
    <div className={"flex items-center w-full gap-1"}>
      <p className="text-gray-600 text-xs w-14">{translations("SORT BY")}:</p>
      <Select
        onValueChange={(value) => handleSortChange(value ?? "")}
        defaultValue={sortOption}
        items={[
          { value: "latest", label: translations("Latest First") },
          { value: "oldest", label: translations("Old First") },
          { value: "a-z", label: translations("A - Z") },
          { value: "z-a", label: translations("Z - A") },
        ]}
      >
        <SelectTrigger className="w-28 rounded-sm">
          <SelectValue placeholder={translations("sort by")} />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            <SelectItem value="latest">{translations("Latest First")}</SelectItem>
            <SelectItem value="oldest">{translations("Old First")}</SelectItem>
            <SelectItem value="a-z">{translations("A - Z")}</SelectItem>
            <SelectItem value="z-a">{translations("Z - A")}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default SortDropdown;

// utils/sorting.js

export const sortData = (data: any[] = [], sortOption: string = "latest") => {
  return [...data].sort((a, b) => {
    const leftName = a.data?.name ?? a.name ?? "";
    const rightName = b.data?.name ?? b.name ?? "";

    switch (sortOption) {
      case "latest":
        return dayjs(a.createdAt).isBefore(b.createdAt) ? 1 : -1;
      case "oldest":
        return dayjs(b.createdAt).isBefore(a.createdAt) ? 1 : -1;
      case "a-z":
        return leftName.localeCompare(rightName);
      case "z-a":
        return rightName.localeCompare(leftName);
      default:
        return 0;
    }
  });
};
