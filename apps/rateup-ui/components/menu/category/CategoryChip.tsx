import { Button } from "@mantine/core";
import { GilroySemibold } from "../../../public/fonts";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <Button
      bg={selected ? "var(--shade-of-brown-selected)" : "var(--shade-of-brown-unselected)"}
      radius={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      className={GilroySemibold.className}
    >
      {name}
    </Button>
  );
}
