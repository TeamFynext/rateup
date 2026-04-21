"use client";

import {
  Anchor,
  Avatar,
  Flex,
  Group,
  Modal,
  Rating,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { Testimonial } from "../../types/global";
import { formatDate } from "../../utils/dateTime";
import { getFileUrlFromKey } from "../../utils/file-upload/upload";
import PaperLayout from "../styled/Layouts/PaperLayout";

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
        bg={currentStyle?.root?.bg}
        p={0}
        maw={350}
        w={280}
        h={310}
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
  const translations = useExtracted();
  return (
    <Stack gap={0} bg={currentStyle?.root?.bg}>
      <Stack bg={currentStyle?.profileBlock.bg} gap={0}>
        {isModal ? (
          <Flex justify={"flex-end"} m={"xs"}>
            <IconX
              onClick={close}
              size={"1.5rem"}
              style={{ cursor: "pointer" }}
              color="black"
            />
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
        {!isModal && testimonial?.testimonial.testimonial?.length >= 80 && (
          <Anchor onClick={open} size="sm">
            {translations("Read more")}
          </Anchor>
        )}
      </Stack>
      {!currentStyle?.ratingBlock.isRemoved &&
      testimonial?.testimonial.rating != null ? (
        <Stack py={"xs"} bg={currentStyle?.ratingBlock.bg} pl={"xl"} h={50}>
          <Rating value={testimonial?.testimonial.rating} readOnly size="lg" />
        </Stack>
      ) : null}
      {!currentStyle?.date.isRemoved ? (
        <Stack p={"md"} px={"xl"}>
          <Text style={currentStyle?.date} size="sm">
            {formatDate(testimonial?.createdAt)}
          </Text>
        </Stack>
      ) : null}
    </Stack>
  );
};
export default TestimonialCard;
