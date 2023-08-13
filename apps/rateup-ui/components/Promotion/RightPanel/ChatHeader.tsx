import { useMantineTheme, Group, Avatar, Text } from "@mantine/core";

export function MainWindowHeader({ image, title, onClick }) {
  const { colors } = useMantineTheme();
  return (
    <Group onClick={onClick} sx={{ backgroundColor: colors.dark[7], color: "white", cursor: "pointer" }} p={"xs"} >
      <Avatar src={image} size={"md"} radius="xl" />
      <Text>{title}</Text>
    </Group>
  )
}