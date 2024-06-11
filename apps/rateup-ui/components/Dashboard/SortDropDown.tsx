import { useState } from "react";
import { Select } from "@mantine/core";
import { IconSelector } from "@tabler/icons-react";

const SortDropdown = ({ onSortChange }) => {
  const [sortOption, setSortOption] = useState("");

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
    />
  );
};

export default SortDropdown;
