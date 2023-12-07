import { Button } from "@mantine/core";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <Button
      bg={selected ? "var(--orange-400)" : "white"}
      c={selected ? "white" : "var(--grey-color, #494949)"}
      radius={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      my={"xs"}
      fz={"clamp(12px, 6.288px + 0.952vw, 20px)"}
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
