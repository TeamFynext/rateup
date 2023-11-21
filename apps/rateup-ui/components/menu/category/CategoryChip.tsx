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
      my={"xs"}
      fz={"clamp(0.75rem, 0.393rem + 0.952vw, 1.25rem)"}
      mx={4}
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
