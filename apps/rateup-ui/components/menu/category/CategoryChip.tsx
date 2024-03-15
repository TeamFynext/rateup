import { UnstyledButton } from "@mantine/core";

export function CategoryChip({
  categoryId,
  name,
  selected,
  onClick,
  largeScreen,
}) {
  return (
    <UnstyledButton
      bg={selected ? "var(--orange-400)" : "white"}
      c={selected ? "white" : "var(--grey-color, #494949)"}
      py={largeScreen ? 4 : 8}
      px={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      my={"xs"}
      fw={500}
      fz={"clamp(15.008px, 11.424px + 0.595vw, 20px)"}
      mx={4}
      style={{
        border: !selected
          ? "0.5px solid var(--grey-color, #494949)"
          : "0.5px solid var(--orange-400)",
        borderRadius: "10px",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </UnstyledButton>
  );
}
