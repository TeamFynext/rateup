import {
  Avatar,
  Group,
  Stack,
  Title,
  Text,
  Rating,
  Anchor,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { formatDate } from "../../utils/dateTime";
import { Testimonial } from "../../types/global";
import PaperLayout from "../styled/Layouts/PaperLayout";

interface TestimonialCardInterface {
  testimonial: Testimonial;
  currentStyle?: any;
}
const TestimonialCard = ({
  testimonial,
  currentStyle = null,
}: TestimonialCardInterface) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <PaperLayout
        shadow="sm"
        radius={"sm"}
        h={300}
        bg={currentStyle?.root?.bg}
        p={0}
        maw={350}
        w={280}
      >
        <TestimonialContent
          testimonial={testimonial}
          isModal={false}
          open={open}
          currentStyle={currentStyle}
        />
      </PaperLayout>
      <Modal
        opened={opened}
        onClose={close}
        radius={"xl"}
        centered
        padding={0}
        withCloseButton={false}
      >
        <TestimonialContent
          testimonial={testimonial}
          isModal={true}
          currentStyle={currentStyle}
          open={() => {}}
        />
      </Modal>
    </>
  );
};

const TestimonialContent = ({ testimonial, isModal, open, currentStyle }) => {
  const isProfileRemoved = currentStyle?.profileBlock.profilePic.isRemoved;
  return (
    <Stack gap={0}>
      <Group bg={currentStyle?.profileBlock.bg} pl={"xl"} py={"lg"}>
        <Avatar
          size={"lg"}
          src={
            isProfileRemoved || !testimonial?.testimonial.photo
              ? null
              : getFileUrlFromKey(testimonial?.testimonial.photo)
          }
        />
        <Stack gap={0} w={160}>
          <Title order={4} style={currentStyle?.profileBlock.profileName}>
            {testimonial?.testimonial.name}
          </Title>
          <Text style={currentStyle?.profileBlock.profilePos} size="sm">
            {testimonial?.testimonial.jobTitle}
          </Text>
        </Stack>
      </Group>
      <Stack
        gap={0}
        pl={"xl"}
        pr={"sm"}
        py={"sm"}
        bg={currentStyle?.descBlock.bg}
      >
        <Text
          size="sm"
          lineClamp={isModal ? null : 3}
          style={currentStyle?.descBlock.desc}
        >
          {testimonial?.testimonial.testimonial}
        </Text>
        {!isModal && testimonial?.testimonial.testimonial.length >= 80 && (
          <Anchor onClick={() => open()}>Read more</Anchor>
        )}
      </Stack>
      {!currentStyle?.ratingBlock.isRemoved &&
        testimonial?.testimonial.rating != null && (
          <Stack py={"xs"} bg={currentStyle?.ratingBlock.bg} pl={"xl"}>
            <Rating
              value={testimonial?.testimonial.rating}
              readOnly
              size="lg"
            />
          </Stack>
        )}
      {!currentStyle?.date.isRemoved && (
        <Stack pl={"xl"}>
          <Text style={currentStyle?.date} size="sm">
            {formatDate(testimonial?.createdAt)}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};
export default TestimonialCard;
