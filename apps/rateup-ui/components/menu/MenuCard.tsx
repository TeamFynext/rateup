import { Flex, Group, Text, Menu, Box, Badge } from "@mantine/core";
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
import ConfirmationModal from "../Modal/ConfirmationModal";
import { notifications } from "@mantine/notifications";

export function MenuCard({
  menu,
  handleEditClick,
}: {
  readonly menu: Menu;
  readonly handleEditClick: (menu: Menu) => void;
}): JSX.Element {
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
      hoveractive={true}
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
                  e.stopPropagation();
                  handleEditClick(menu);
                }}
              />
              <MenuCardMenu menuId={menu.id} teamId={menu.teamId} close />
            </Group>
          </Flex>
          <Text size="lg">{menu.displayName}</Text>
        </Box>
        {menu?.team?.code && (
          <Badge color="var(--tertiary-color)" variant="outline">
            {menu?.team?.code}
          </Badge>
        )}
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

  return (
    <Menu offset={0} withArrow>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel="Are you sure to delete this Menu?"
        headerTitle="Delete Menu?"
        confirmLabel="Delete"
        onConfirm={(e) => {
          e.stopPropagation();
          notifications.show({
            id: "delete-data-menu",
            loading: true,
            title: "Deleting menu..",
            message: `Hold on, menu is getting deleted...`,
            autoClose: false,
            withCloseButton: false,
          });
          deleteMutation.mutate(menuId);
          closeDialog();
        }}
      />
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
