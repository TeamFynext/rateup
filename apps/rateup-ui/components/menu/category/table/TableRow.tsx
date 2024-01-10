import {
  ActionIcon,
  Anchor,
  Box,
  Flex,
  Image,
  Spoiler,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import React from "react";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import {
  IconCircleCheckFilled,
  IconEdit,
  IconTrash,
  IconWashDrycleanOff,
  IconReplace,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { notifications } from "@mantine/notifications";
import { currencyLabel } from "../../util/currencyData";
import { fallbackImage } from "../../../../utils/constants";
import MenuFoodLabelBadge from "../tag/MenuFoodLabelBadge";

const TableRow = ({
  item,
  MenuItemPriceType,
  deleteItemMutation,
  setEditingItem,
  open,
  toggleSwapOrder,
  updateMenuItemMutation,
  currency = "0",
}) => {
  const [dialogOpened, { toggle, close }] = useDisclosure(false);

  return (
    <Table.Tr opacity={item?.disabled ? 0.5 : 1}>
      <Table.Td>
        <Image
          style={{ borderRadius: "4px", aspectRatio: "4/3" }}
          src={
            item?.images?.length > 0
              ? getFileUrlFromKey(item?.images[0])
              : fallbackImage
          }
          alt={item?.name}
          w={100}
        />
      </Table.Td>
      <Table.Td tt={"capitalize"}>{item?.name}</Table.Td>
      <Table.Td>
        {item?.price?.type === MenuItemPriceType.FIXED ? (
          <Text>
            {item?.price?.price && (
              <>
                {currencyLabel[currency]?.symbol}&nbsp;
                {item?.price?.price}
              </>
            )}
          </Text>
        ) : (
          <Stack>
            {item?.price?.variants?.map((element) => (
              <Box key={element?.name + item.id}>
                <Text c="dimmed" fz="md">
                  {element?.name}
                </Text>
                <Text>
                  {element?.price && (
                    <>
                      {currencyLabel[currency]?.symbol}&nbsp;
                      {element?.price}
                    </>
                  )}
                </Text>
              </Box>
            ))}
          </Stack>
        )}
      </Table.Td>
      <Table.Td>
        <Text>
          <Spoiler
            showLabel="Show more"
            hideLabel="Hide"
            transitionDuration={0}
          >
            {item?.description}
          </Spoiler>
        </Text>
      </Table.Td>
      <Table.Td>
        <Anchor href={item?.videoUrl} target="_blank">
          {item?.videoUrl}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Flex maw={"300px"} wrap={"wrap"} gap={4}>
          <MenuFoodLabelBadge foodLabels={item?.foodLabels ?? []} />
        </Flex>
      </Table.Td>
      <Table.Td>
        <Flex maw="100px" h="100px" align="center" gap={"lg"} mr={"sm"}>
          <ConfirmationModal
            forDeleteFunctionality
            opened={dialogOpened}
            onClose={close}
            headerLabel="Are you sure to delete this Menu Item?"
            headerTitle="Delete Menu Item?"
            confirmLabel="Delete"
            onConfirm={(e) => {
              notifications.show({
                id: "delete-data-menu-item",
                loading: true,
                title: "Deleting menu item..",
                message: `Hold on, menu item is getting deleted...`,
                autoClose: false,
                withCloseButton: false,
              });
              deleteItemMutation.mutate(item?.id);
              close();
            }}
          />
          <ActionIcon
            c={"var(--tertiary-color)"}
            bg={"white"}
            radius={"md"}
            disabled={item?.disabled}
            onClick={(e) => {
              e.preventDefault();
              setEditingItem(item);
              open();
            }}
          >
            <Tooltip label="Edit">
              <IconEdit />
            </Tooltip>
          </ActionIcon>
          <ActionIcon
            variant={"transparent"}
            c={"var(--tertiary-color)"}
            radius={"md"}
            onClick={(e) => {
              e.preventDefault();
              updateMenuItemMutation.mutate({
                menuItemId: item?.id,
                menuItem: {
                  disabled: !item?.disabled,
                },
              });
            }}
          >
            {item?.disabled ? (
              <Tooltip label="Enable Item">
                <IconWashDrycleanOff />
              </Tooltip>
            ) : (
              <Tooltip label="Disable Item">
                <IconCircleCheckFilled />
              </Tooltip>
            )}
          </ActionIcon>
          <ActionIcon c={"black"} bg={"white"} radius={"md"} onClick={toggle}>
            <Tooltip label="Delete">
              <IconTrash />
            </Tooltip>
          </ActionIcon>
        </Flex>
      </Table.Td>
      <Table.Td>
        <Stack pr={"sm"}>
          <ActionIcon
            variant={"transparent"}
            onClick={toggleSwapOrder}
            c={"var(--grey-color)"}
          >
            <Tooltip label="Swap Order">
              <IconReplace />
            </Tooltip>
          </ActionIcon>
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
};

export default TableRow;
