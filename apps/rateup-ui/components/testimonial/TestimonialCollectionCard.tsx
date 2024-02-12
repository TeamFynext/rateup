import { Stack, Title, Text } from "@mantine/core";
import { useRouter } from "next/router";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { formatDate } from "../../utils/dateTime";

const TestimonialCollectionCard = ({ collection }) => {
  const router = useRouter();
  return (
    <PaperLayout
      shadow="xl"
      onClick={() => {
        // router.push(`${router.pathname}/${collection.id}`)
      }}
    >
      <Stack>
        <Title order={3}>{collection?.name}</Title>
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
