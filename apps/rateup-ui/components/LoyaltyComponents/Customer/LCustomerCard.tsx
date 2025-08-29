"use client";

import React from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  Avatar,
  Flex,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircle1, IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useDeleteLoyaltyCustomerMutation } from "@/backend/loyalty/customer/customer.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const LCustomerCard = ({ customer }) => {
  const router = useRouter();
  return (
    <PaperLayout
      onClick={() => router.push(`/dashboard/loyalty/customer/${customer.id}`)}
      style={{ cursor: "pointer" }}
      hoveractive
    >
      <Group>
        <Avatar
          name={customer?.name}
          color="var(--shade-of-blue-14)"
          size={"lg"}
        />
        <Stack gap={0} flex={1}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {customer?.name}
            </Text>
            <CustomerMenu row={customer} />
          </Group>
          <Text size="sm" c={"gray"}>
            {customer?.phone}
          </Text>
          <Group c={"orange"} gap={2}>
            <IconCircle1 size={"1rem"} stroke={3} />
            <Text size="sm">{customer?.balancePoints} Points</Text>
          </Group>
        </Stack>
      </Group>
    </PaperLayout>
  );
};

export default LCustomerCard;

export const CustomerMenu = ({ row }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const translations = useTranslations();
  const deleteMut = useDeleteLoyaltyCustomerMutation();
  const handleDelete = () => {
    deleteMut.mutate(row.id, {
      onSettled: () => {
        close();
      },
    });
  };

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" onClick={(e) => e.stopPropagation()}>
          <IconDotsVertical size={"1rem"} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={"1rem"} />}
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          {translations("Delete")}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        confirmLabel={translations("Delete")}
        headerTitle={translations("Delete")}
        headerLabel={translations("Are you sure to delete this")}
        onClose={close}
        opened={opened}
        onConfirm={() => handleDelete()}
        closeLabel={translations("Cancel")}
        forDeleteFunctionality
        deleteQuotion={""}
        key={row?.id}
      />
    </Menu>
  );
};
