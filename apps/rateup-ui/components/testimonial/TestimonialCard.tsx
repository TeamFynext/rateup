import {
  Avatar,
  Group,
  Stack,
  Title,
  Text,
  Rating,
  Anchor,
  Modal,
  Space,
  Flex,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import { formatDate } from "../../utils/dateTime";
import { Testimonial } from "../../types/global";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { IconX } from "@tabler/icons-react";

interface TestimonialCardInterface {
  testimonial: Omit<Testimonial, "teamId" | "survey">;
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
        h={310}
        bg={currentStyle?.root?.bg}
        p={0}
        maw={350}
        w={280}
      >
        <TestimonialContent
          testimonial={testimonial}
          isModal={false}
          open={open}
          close={close}
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
          open={open}
          close={close}
        />
      </Modal>
    </>
  );
};

const TestimonialContent = ({
  testimonial,
  isModal,
  open,
  currentStyle,
  close,
}) => {
  const isProfileRemoved = currentStyle?.profileBlock.profilePic.isRemoved;
  return (
    <Stack gap={0} bg={currentStyle?.root?.bg}>
      <Stack bg={currentStyle?.profileBlock.bg} gap={0}>
        {isModal ? (
          <Flex justify={"flex-end"} m={"xs"}>
            <ActionIcon
              onClick={close}
              variant="subtle"
              color={currentStyle?.profileBlock.bg}
            >
              <IconX size={"1.5rem"} color="black" />
            </ActionIcon>
          </Flex>
        ) : null}
        <Group pl={"xl"} py={"md"} h={90}>
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
      </Stack>

      <Stack
        gap={0}
        pl={"xl"}
        pr={"sm"}
        py={"sm"}
        bg={currentStyle?.descBlock.bg}
        mih={105}
      >
        <Text
          size="sm"
          lineClamp={isModal ? null : 3}
          style={currentStyle?.descBlock.desc}
        >
          {testimonial?.testimonial.testimonial}
        </Text>
        {!isModal && testimonial?.testimonial.testimonial.length >= 80 && (
          <Anchor onClick={open} size="sm">
            Read more
          </Anchor>
        )}
      </Stack>
      {!currentStyle?.ratingBlock.isRemoved &&
      testimonial?.testimonial.rating != null ? (
        <Stack py={"xs"} bg={currentStyle?.ratingBlock.bg} pl={"xl"} h={50}>
          <Rating value={testimonial?.testimonial.rating} readOnly size="lg" />
        </Stack>
      ) : (
        <Space h={50} />
      )}
      {!currentStyle?.date.isRemoved && (
        <Stack p={"md"} px={"xl"}>
          <Text style={currentStyle?.date} size="sm">
            {formatDate(testimonial?.createdAt)}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};
export default TestimonialCard;
