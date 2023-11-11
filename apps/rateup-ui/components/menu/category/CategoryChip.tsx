import { Button } from "@mantine/core";
import { GilroySemibold } from "../../../public/fonts";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <Button
      bg={selected ? "var(--orange-400)" : "white"}
      c={selected ? "white" : "var(--grey-color, #494949)"}
      radius={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      className={GilroySemibold.className}
      style={{
        border: !selected
          ? "0.5px solid var(--grey-color, #494949)"
          : "0.5px solid var(--orange-400)",
      }}
    >
      {name}
    </Button>
  );
}
