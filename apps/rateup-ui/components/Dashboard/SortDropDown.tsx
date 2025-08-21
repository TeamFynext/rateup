import { useState } from "react";

import { Group, Text as MantineText, Select } from "@mantine/core";
import { IconSelector } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";

const SortDropdown = ({ onSortChange, defaultSortOption = "latest" }) => {
  const [sortOption, setSortOption] = useState(defaultSortOption);
  const translations = useTranslations();
  const handleSortChange = (value) => {
    setSortOption(value);
    onSortChange(value);
  };

  return (
    <Group style={{ alignItems: "center", gap: "3px" }}>
      <MantineText>{translations("SORT BY")}:</MantineText>
      <Select
        placeholder={translations("Sort by")}
        value={sortOption}
        onChange={handleSortChange}
        data={[
          { value: "latest", label: translations("Latest First") },
          { value: "oldest", label: translations("Old First") },
          { value: "a-z", label: translations("A - Z") },
          { value: "z-a", label: translations("Z - A") },
        ]}
        styles={{
          input: {
            borderRadius: 25,
            width: "130px",
          },
        }}
      />
    </Group>
  );
};

export default SortDropdown;

// utils/sorting.js

export const sortData = (data: any[] = [], sortOption: string) => {
  return [...data].sort((a, b) => {
    switch (sortOption) {
      case "latest":
        return dayjs(a.createdAt).isBefore(b.createdAt) ? 1 : -1;
      case "oldest":
        return dayjs(b.createdAt).isBefore(a.createdAt) ? 1 : -1;
      case "a-z":
        return a.data?.name.localeCompare(b.data.name);
      case "z-a":
        return b.data?.name.localeCompare(a.data.name);
      default:
        return 0;
    }
  });
};
