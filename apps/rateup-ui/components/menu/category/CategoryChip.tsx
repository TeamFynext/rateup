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
      bg={selected ? "var(--orange-400)" : "var(--mantine-color-body)"}
      c={selected ? "white" : "var(--text-color, #494949)"}
      py={largeScreen ? 4 : 7}
      px={"md"}
      onClick={() => onClick(categoryId)}
      tt={"capitalize"}
      my={"xs"}
      fw={500}
      fz={"clamp(14px, 9.712px + 0.714vw, 20px)"}
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
