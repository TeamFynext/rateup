"use client";

import { useRouter } from "next/navigation";

import { ActionIcon, Group, Menu, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDots, IconEdit, IconShare, IconTrash } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { useDeleteTestimonialCollection } from "../../backend/testimonials/testimonial.query";
import { formatDate } from "../../utils/dateTime";
import ConfirmationModal from "../Modal/ConfirmationModal";
import PaperLayout from "../styled/Layouts/PaperLayout";

const TestimonialCollectionCard = ({ collection }) => {
  const router = useRouter();
  const deleteCollectionMutation = useDeleteTestimonialCollection();
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  function deleteCollection() {
    deleteCollectionMutation.mutate(collection?.id);
  }
  const translations = useExtracted();
  return (
    <PaperLayout
      hoveractive
      shadow="xl"
      onClick={() => {
        router.push(`testimonial/${collection.id}`);
      }}
    >
      <Stack>
        <ConfirmationModal
          forDeleteFunctionality
          confirmLabel={translations("Delete")}
          headerLabel={translations("Are you sure to delete this collection?")}
          headerTitle={translations("Delete Testimonial Collection?")}
          opened={dialogOpened}
          onClose={closeDialog}
          onConfirm={deleteCollection}
        />
        <Group justify="space-between">
          <Title order={4}>{collection?.name}</Title>
          <TestimonialCollectionCardMenu
            collectionId={collection?.id}
            openDialog={openDialog}
          />
        </Group>

        <Stack gap={0}>
          <Text
            fz={15}
          >{`${collection?._count?.testimonials} Testimonials`}</Text>
          <Text fz={15}>{formatDate(collection?.createdAt)}</Text>
        </Stack>
      </Stack>
    </PaperLayout>
  );
};

const TestimonialCollectionCardMenu = ({ collectionId, openDialog }) => {
  const router = useRouter();
  const translations = useExtracted();
  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={(e) => e.stopPropagation()}
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit />}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`testimonial/${collectionId}?tab=Edit`);
          }}
        >
          {translations("Edit")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconShare />}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`testimonial/${collectionId}?tab=Share`);
          }}
        >
          {translations("Share")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconTrash />}
          onClick={(e) => {
            e.stopPropagation();
            openDialog();
          }}
        >
          {translations("Delete")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default TestimonialCollectionCard;
