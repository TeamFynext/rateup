import { Stack, Title, Text, Group, ActionIcon } from "@mantine/core";
import { useRouter } from "next/router";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { formatDate } from "../../utils/dateTime";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteTestimonialCollection } from "../../backend/testimonials/testimonial.query";

const TestimonialCollectionCard = ({ collection }) => {
  const router = useRouter();
  const deleteCollectionMutation = useDeleteTestimonialCollection();
  function deleteCollection(e) {
    e.stopPropagation();
    deleteCollectionMutation.mutate(collection?.id);
  }
  return (
    <PaperLayout
      shadow="xl"
      onClick={() => {
        router.push(`${router.pathname}/${collection.id}`);
      }}
    >
      <Stack>
        <Group justify="space-between">
          <Title order={4}>{collection?.name}</Title>
          <ActionIcon
            onClick={deleteCollection}
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
