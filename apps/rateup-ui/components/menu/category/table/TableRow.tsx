"use client";

import {
  ActionIcon,
  Anchor,
  Box,
  Flex,
  Image,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCircleCheckFilled,
  IconEdit,
  IconReplace,
  IconTrash,
  IconWashDrycleanOff,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { fallbackImage } from "../../../../utils/constants";
import { getImageValue } from "../../../../utils/file-upload/upload";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { HoverCardComponent } from "../../../Survey/HoverCard/HoverCard";
import { ActionIconCommon } from "../../ActionIcon/ActionIconCommon";
import { currencyLabel } from "../../util/currencyData";
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
  const translations = useTranslations();
  return (
    <Table.Tr opacity={item?.disabled ? 0.5 : 1}>
      <Table.Td>
        <Image
          style={{ borderRadius: "4px", aspectRatio: 3 / 2 }}
          src={
            item?.images?.length > 0
              ? getImageValue(
                  item?.images[0],
                  false,
                  item?.unsplashImage?.find((data) => data === item?.images[0])
                    ?.length > 0,
                )
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
                {currencyLabel[currency]?.symbol}
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
                      {currencyLabel[currency]?.symbol}
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
        <HoverCardComponent
          content={item?.description}
          lineClamp={3}
          c={"dimmed"}
        />
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
            headerLabel={translations("Are you sure to delete this Menu Item?")}
            headerTitle={translations("Delete Menu Item?")}
            confirmLabel={translations("Delete")}
            onConfirm={(e) => {
              toast.loading(
                translations("Hold on, menu item is getting deleted"),
                {
                  id: "delete-data-menu-item",
                },
              );
              deleteItemMutation.mutate(item?.id);
              close();
            }}
          />
          <ActionIconCommon
            disabled={item?.disabled}
            handleClick={(e) => {
              e.preventDefault();
              setEditingItem(item);
              open();
            }}
            label="Edit"
          >
            <IconEdit size={18} />
          </ActionIconCommon>
          <ActionIcon
            variant={"transparent"}
            c={"var(--mantine-primary-color-filled)"}
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
              <Tooltip label={translations("Enable Item")}>
                <IconWashDrycleanOff />
              </Tooltip>
            ) : (
              <Tooltip label={translations("Disable Item")}>
                <IconCircleCheckFilled />
              </Tooltip>
            )}
          </ActionIcon>
          <ActionIconCommon handleClick={toggle} label={translations("Delete")}>
            <IconTrash />
          </ActionIconCommon>
        </Flex>
      </Table.Td>
      <Table.Td>
        <Stack pr={"sm"}>
          <ActionIconCommon
            handleClick={toggleSwapOrder}
            label={translations("Swap Order")}
          >
            <IconReplace size={18} />
          </ActionIconCommon>
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
};

export default TableRow;
