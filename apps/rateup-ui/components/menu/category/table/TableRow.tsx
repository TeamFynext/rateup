import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Image,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import React from "react";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import DeleteConfirmationBox from "../../dialogBox/DeleteConfirmationBox";
import { useDisclosure } from "@mantine/hooks";
import { IconMenuOrder } from "@tabler/icons-react";

const TableRow = ({
  item,
  MenuItemPriceType,
  deleteItemMutation,
  setEditingItem,
  open,
  toggleSwapOrder,
}) => {
  const [dialogOpened, { toggle, close }] = useDisclosure(false);

  return (
    <Table.Tr>
      <Table.Td>
        <Image
          style={{ borderRadius: "4px", aspectRatio: "1/1" }}
          src={
            item?.images?.length > 0
              ? getFileUrlFromKey(item?.images[0])
              : "/images/no_image_template.jpeg"
          }
          alt={item?.name}
          h={100}
          w={100}
        />
      </Table.Td>
      <Table.Td tt={"capitalize"}>{item?.name}</Table.Td>
      <Table.Td>
        {item?.price?.type === MenuItemPriceType.FIXED ? (
          <Text>₹{item?.price?.price}</Text>
        ) : (
          <Stack>
            {item?.price?.variants?.map((element) => (
              <Box key={element?.name + item.id}>
                <Text c="dimmed" fz="md">
                  {element?.name}
                </Text>
                <Text>₹{element?.price}</Text>
              </Box>
            ))}
          </Stack>
        )}
      </Table.Td>
      <Table.Td>
        <Text lineClamp={7}>{item?.description}</Text>
      </Table.Td>
      <Table.Td>
        <Anchor href={item?.videoUrl} target="_blank">
          {item?.videoUrl}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Group maw="100px" h="100px" align="center">
          <DeleteConfirmationBox
            closeDialog={close}
            dialogOpened={dialogOpened}
            data={item?.id}
            mutation={deleteItemMutation}
            text={"Are you sure to delete this Menu Item?"}
          />
          <ActionIcon
            c={"var(--tertiary-color)"}
            bg={"white"}
            radius={"md"}
            onClick={(e) => {
              e.preventDefault();
              setEditingItem(item);
              open();
            }}
          >
            <IconEdit />
          </ActionIcon>
          <ActionIcon c={"black"} bg={"white"} radius={"md"} onClick={toggle}>
            <IconTrash />
          </ActionIcon>
        </Group>
      </Table.Td>
      <Table.Td>
        <Stack pr={"sm"}>
          <ActionIcon variant={"transparent"} onClick={toggleSwapOrder}>
            <IconMenuOrder />
          </ActionIcon>
        </Stack>
      </Table.Td>
    </Table.Tr>
  );
};

export default TableRow;
