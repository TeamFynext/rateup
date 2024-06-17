import { useState } from "react";
import { Select } from "@mantine/core";
import { IconSelector } from "@tabler/icons-react";
import dayjs from "dayjs";

const SortDropdown = ({ onSortChange, defaultSortOption = "latest" }) => {
  const [sortOption, setSortOption] = useState(defaultSortOption);

  const handleSortChange = (value) => {
    setSortOption(value);
    onSortChange(value);
  };

  return (
    <Select
      placeholder="Sort by"
      value={sortOption}
      onChange={handleSortChange}
      data={[
        { value: "latest", label: "Latest First" },
        { value: "oldest", label: "Old First" },
        { value: "a-z", label: "A - Z" },
        { value: "z-a", label: "Z - A" },
      ]}
      styles={{
        input: {
          borderRadius: 25,
          width: "150px",
        },
      }}
    />
  );
};

export default SortDropdown;

// utils/sorting.js

export const sortData = (data, sortOption) => {
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
