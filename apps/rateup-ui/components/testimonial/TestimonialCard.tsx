import {
  Avatar,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Rating,
  Anchor,
  Modal,
} from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useDisclosure } from "@mantine/hooks";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import dayjs from "dayjs";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import { useContext } from "react";

const TestimonialCard = ({ testimonial, currentStyle = null }) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <PaperLayout shadow="xl" h={300} bg={currentStyle?.root?.bg} p={0}>
        <TestimonialContent
          testimonial={testimonial}
          isModal={false}
          open={open}
          currentStyle={currentStyle}
        />
      </PaperLayout>
      <Modal opened={opened} onClose={close} radius={"xl"} centered padding={0}>
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
      <Group bg={currentStyle?.profileBlock.bg} pl={"md"} py={"md"}>
        <Avatar
          size={"lg"}
          src={
            isProfileRemoved
              ? null
              : getFileUrlFromKey(testimonial?.testimonial.photo)
          }
        />
        <Stack gap={0}>
          <Title order={4} style={currentStyle?.profileBlock.profileName}>
            {testimonial?.testimonial.name}
          </Title>
          <Text style={currentStyle?.profileBlock.profilePos}>
            {testimonial?.testimonial.jobTitle}
          </Text>
        </Stack>
      </Group>
      <Stack gap={0} pl={"md"} py={"sm"} bg={currentStyle?.descBlock.bg}>
        <Text
          lineClamp={isModal ? null : 3}
          style={currentStyle?.descBlock.desc}
        >
          {testimonial?.testimonial.testimonial}
        </Text>
        {!isModal && testimonial?.testimonial.testimonial.length >= 80 && (
          <Anchor onClick={() => open()}>Read more</Anchor>
        )}
      </Stack>
      {!currentStyle?.ratingBlock.isRemoved && (
        <Stack py={"xs"} bg={currentStyle?.ratingBlock.bg} pl={"md"}>
          <Rating value={testimonial?.testimonial.rating} readOnly size="lg" />
        </Stack>
      )}
      {!currentStyle?.date.isRemoved && (
        <Stack pl={"md"}>
          <Text style={currentStyle?.date}>
            {dayjs(testimonial?.createdAt).format("DD/MM/YYYY")}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};
export default TestimonialCard;
