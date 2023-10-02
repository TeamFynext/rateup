import { useMantineTheme, Group, Text } from "@mantine/core";

export function MainWindowHeader({ title, onClick }) {
  const { colors } = useMantineTheme();
  return (
    <Group
      onClick={onClick}
      style={{
        background: "linear-gradient(270deg, #3F5BA9 -18.1%, #49C8E9 416.79%)",
        color: "white",
        cursor: "pointer",
        borderRadius: "8px",
      }}
      p={"lg"}
      mih={"75px"}
    >
      <Text>{title}</Text>
    </Group>
  )
}