import { Box } from "@mantine/core";
import Link from "next/link";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <Link
      href={`#${categoryId}`}
      style={{
        textDecoration: "none",
      }}
    >
      <Box
        p="sm"
        onClick={() => onClick(categoryId)}
        key={categoryId}
        style={{
          borderRadius: "8px",
          backgroundColor: selected ? "#B06B2E" : "#A3A3A3",
          color: "white",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        {name}
      </Box>
    </Link>
  );
}
