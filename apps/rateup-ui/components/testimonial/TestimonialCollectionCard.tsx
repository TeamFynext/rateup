import { Stack, Title, Text, Group, ActionIcon } from "@mantine/core";
import { useRouter } from "next/router";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { formatDate } from "../../utils/dateTime";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteTestimonialCollection } from "../../backend/testimonials/testimonial.query";
import ConfirmationModal from "../Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";

const TestimonialCollectionCard = ({ collection }) => {
  const router = useRouter();
  const deleteCollectionMutation = useDeleteTestimonialCollection();
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  function deleteCollection() {
    deleteCollectionMutation.mutate(collection?.id);
  }
  return (
    <PaperLayout
      hoveractive
      shadow="xl"
      onClick={() => {
        router.push(`${router.pathname}/${collection.id}`);
      }}
    >
      <Stack>
        <ConfirmationModal
          forDeleteFunctionality
          confirmLabel="Delete"
          headerLabel="Are you sure to delete this collection?"
          headerTitle="Delete Testimonial Collection?"
          opened={dialogOpened}
          onClose={closeDialog}
          onConfirm={deleteCollection}
        />
        <Group justify="space-between">
          <Title order={4}>{collection?.name}</Title>
          <ActionIcon
            onClick={(e) => {
              e.stopPropagation();
              openDialog();
            }}
            variant="subtle"
            size={"sm"}
            color="red"
          >
            <IconTrash />
          </ActionIcon>
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

export default TestimonialCollectionCard;
