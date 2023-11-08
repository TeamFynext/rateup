import {
  useMantineTheme,
  Flex,
  Group,
  Text,
  Menu,
  Box,
  Dialog,
} from "@mantine/core";
import {
  IconDots,
  IconMapPinFilled,
  IconPencil,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getTimeSince } from "../../utils";

import { useDeleteMenuMutation } from "../../backend/menu/menu.query";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useDisclosure } from "@mantine/hooks";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../Button/RateupButtons";
import { updateSuccessToast } from "../../utils/notifications";
// TODO: Create a generic Card with menu
export function MenuCard({
  menu,
  handleEditClick,
}: {
  menu: Menu;
  handleEditClick: (menu: Menu) => void;
}): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");

  const router = useRouter();
  useEffect(() => {
    setTimeSince(getTimeSince(menu.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(menu.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, [menu?.createdAt]);

  return (
    <PaperLayout
      p="md"
      shadow="lg"
      radius="lg"
      mih={"175px"}
      style={{ cursor: "pointer" }}
      onClick={() => {
        router.push(`/dashboard/menu/${menu.id}`);
      }}
    >
      <Flex
        justify={"space-between"}
        direction={"column"}
        style={{ height: "100%" }}
      >
        <Box>
          <Flex justify={"space-between"} align={"center"}>
            <Text mr={"sm"} truncate size="xl" fw={700}>
              {menu.name}
            </Text>
            <Group align={"center"} mt="sm" gap="xs">
              <IconPencil
                size={20}
                onClick={(e) => {
                  e.stopPropagation(), handleEditClick(menu);
                }}
              />
              <MenuCardMenu menuId={menu.id} teamId={menu.teamId} close />
            </Group>
          </Flex>
          <Text size="lg">{menu.displayName}</Text>
        </Box>
        <Flex align={"center"} justify={"space-between"}>
          <Flex>
            <Text size="sm" c="dimmed">
              Created {timeSince}
            </Text>
          </Flex>
          <Flex align={"center"}>
            <IconMapPinFilled size={16} />
            <Text ml={4}>{menu.locationText}</Text>
          </Flex>
        </Flex>
      </Flex>
    </PaperLayout>
  );
}

function MenuCardMenu({ menuId, teamId, close }) {
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

  const deleteMutation = useDeleteMenuMutation(
    teamId,
    () => {},
    () => {},
  );
  const router = useRouter();

  if (deleteMutation.isPending)
    updateSuccessToast("Hold on, Menu is getting deleted", "menu-delete");
  return (
    <Menu offset={0} withArrow>
      <Dialog
        opened={dialogOpened}
        withCloseButton
        onClose={closeDialog}
        size="lg"
        radius="md"
        position={{ top: "0", left: "40vw" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Text size="md" mb="xs" fw={500}>
          Are you sure to delete this Menu?
        </Text>

        <Group align="center" pt="lg">
          <RateupButtonSecondary
            onClick={(e) => {
              e.stopPropagation();
              closeDialog();
            }}
            disabled={deleteMutation.isPending}
            size="md"
            title="Cancel"
          />

          <RateupButtonPrimary
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate(menuId);
            }}
            loading={deleteMutation.isPending}
            size="md"
            title="Yes, Delete"
          />
        </Group>
      </Dialog>
      <Menu.Target>
        <Group
          onClick={(e) => {
            e.stopPropagation();
          }}
          align="center"
        >
          <IconDots size={20} />
        </Group>
      </Menu.Target>
      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          leftSection={<IconShare size={16} />}
          onClick={() => {
            router.push(`/dashboard/menu/${menuId}?tab=Share`);
          }}
        >
          Share
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash size={16} />} onClick={toggle}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
