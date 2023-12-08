import { UnstyledButton } from "@mantine/core";

export function CategoryChip({ categoryId, name, selected, onClick }) {
  return (
    <UnstyledButton
      bg={selected ? "var(--orange-400)" : "white"}
      c={selected ? "white" : "var(--grey-color, #494949)"}
      py={4}
      px={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      my={"xs"}
      fw={400}
      fz={"clamp(12px, 6.288px + 0.952vw, 20px)"}
      mx={4}
      style={{
        border: !selected
          ? "0.5px solid var(--grey-color, #494949)"
          : "0.5px solid var(--orange-400)",
        borderRadius: "10px",
      }}
    >
      {name}
    </UnstyledButton>
  );
}
