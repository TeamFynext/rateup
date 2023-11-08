import { Button } from "@mantine/core";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <Button
      component="a"
      href={`#${categoryId}`}
      bg={selected ? "var(--shade-of-brown-selected)" : "var(--shade-of-brown-unselected)"}
      radius={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
    >
      {name}
    </Button>
  );
}
