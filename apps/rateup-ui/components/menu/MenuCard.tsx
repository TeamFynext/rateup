import { useMantineTheme, Paper, Flex, Group, Avatar, Space, Text, ActionIcon, Menu, Box } from "@mantine/core";
import { IconDots, IconPencil, IconShare, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getTimeSince } from "../../utils";

import { useDeleteMenuMutation } from "../../backend/menu/menu.query";

// TODO: Create a generic Card with menu
export function MenuCard({
  menu,
  handleEditClick,
}: {
  menu: Menu,
  handleEditClick: (menu: Menu) => void,
}): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");

  const router = useRouter();
  useEffect(() => {
    setTimeSince(getTimeSince(menu.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(menu.createdAt)),
      5000
    );
    return () => clearInterval(timeoutID);
  }, []);

  return (
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      mih={"175px"}
      sx={{ cursor: "pointer" }}
      onClick={() => {
        router.push(
          `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/menu/${menu.id}`
        );
      }}
    >
      <Flex justify={"space-between"} direction={"column"} sx={{ height: "100%" }}>
        <Box>
          <Flex justify={"space-between"} align={"center"}>

            <Text mr={"sm"} truncate size="xl" fw={700}>
              {menu.name}
            </Text>
            <Group align={"center"} mt="sm" spacing="xs">
              <IconShare
                onClick={(e) => {
                  e.stopPropagation(),
                    router.push(
                      `/dashboard/menu/${menu.id}?tab=Share`
                    )
                }}
              />
              <IconPencil
                onClick={(e) => {
                  e.stopPropagation(),
                    handleEditClick(menu);
                }}
              />
              <MenuCardMenu
                menuId={menu.id}
                teamId={menu.teamId}
                close
              />
            </Group>
          </Flex>
          <Text size="lg" color="#333" >
            {menu.displayName}
          </Text>
        </Box>
        <Box>
          <Text size="sm" c="dimmed">
            Created {timeSince}
          </Text>
        </Box>
      </Flex>
    </Paper>
  );
}

function MenuCardMenu({ menuId, teamId, close }) {
  const deleteMutation = useDeleteMenuMutation(
    teamId,
    () => { },
    () => { }
  );

  return (
    <Menu width={200}>
      <Menu.Target>
        <ActionIcon
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          icon={<IconTrash />}
          onClick={() => {
            deleteMutation.mutate(menuId);
          }}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}