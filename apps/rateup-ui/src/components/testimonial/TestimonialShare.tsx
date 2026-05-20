"use client";

import { useState } from "react";

import {
  ActionIcon,
  Center,
  CopyButton,
  Flex,
  Group,
  Image,
  Modal,
  Paper,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconChevronLeft, IconCopy, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons.tsx";
import NothingFound from "../NothingFound/NothingFound.tsx";
import TestimonialCard from "./TestimonialCard.tsx";

const TestimonialShare = ({ selectedTestimonials, currentStyle }) => {
  const filteredTestimonials = selectedTestimonials;
  const { t: translations } = useTranslation();
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={translations("No testimonials found")} />
      </Center>
    );

  return (
    <ScrollAreaAutosize h={"100%"}>
      <Stack>
        <Group p={"sm"}>
          {filteredTestimonials?.map((testimonial, index) => (
            <TestimonialCard
              testimonial={testimonial}
              currentStyle={currentStyle}
              key={testimonial?.id}
            />
          ))}
        </Group>
      </Stack>
    </ScrollAreaAutosize>
  );
};

export const TestimonialShareModal = ({ opened, onClose, collectionId }) => {
  const shareUrl = `${import.meta.env.VITE_FRONTEND_URL}/public/testimonial/${collectionId}`;
  const iframe = `<iframe src="${shareUrl}" width="100%"></iframe>`;

  const [isPreview, setIsPreview] = useState(false);
  const { t: translations } = useTranslation();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="1000px"
      padding={0}
      bg={"red"}
      radius={"lg"}
      closeOnClickOutside
      withCloseButton={false}
      centered
      zIndex={400}
    >
      {!isPreview ? (
        <Stack>
          <Stack
            bg={"var(--tertiary-color)"}
            p={"xl"}
            c={"white"}
            gap={0}
            style={{ borderRadius: "10px" }}
          >
            <Flex justify={"flex-end"}>
              <ActionIcon onClick={onClose} color="var(--tertiary-color)">
                <IconX size={"1.5rem"} />
              </ActionIcon>
            </Flex>
            <Group gap={"xs"} justify="center" align="center">
              <Stack gap={0}>
                <Title fw={400}>
                  {translations("Share Your Testimonials")}
                </Title>
                <Title order={5} fw={400}>
                  {translations(
                    "Follow the instruction to share your testimonials on your website",
                  )}
                </Title>
              </Stack>
              <Image src={`../../images/Party Svg Icon.svg`} w={60} h={60} />
            </Group>
          </Stack>
          <Stack px={100} py={"xl"}>
            <Stack>
              <Title order={5}>Add this widget to your website</Title>
              <ScrollArea offsetScrollbars={"x"}>
                <Paper bg="black" c={"white"} py={"xl"}>
                  <Text pl={"md"} fz={"sm"}>
                    {iframe}
                  </Text>
                </Paper>
              </ScrollArea>
              <CopyButton value={iframe}>
                {({ copied, copy }) => (
                  <RateupButtonSecondary
                    title={
                      copied
                        ? translations("Copied code")
                        : translations("Copy code")
                    }
                    onClick={copy}
                    rightIcon={<IconCopy />}
                    styles={{ root: { width: "fit-content" } }}
                  />
                )}
              </CopyButton>
            </Stack>
            <Text c={"#494949"} fw={400}>
              {translations(
                "Place this code in the desired section of your website to display the embed.",
              )}
            </Text>
            <RateupButtonBlue
              title={translations("Preview")}
              styles={{ root: { width: "fit-content" } }}
              onClick={() => setIsPreview(true)}
            />
          </Stack>
        </Stack>
      ) : (
        <>
          <RateupButtonBlue
            styles={{
              root: {
                background: "transparent",
                color: "var(--tertiary-color)",
              },
            }}
            title={translations("Back")}
            leftIcon={<IconChevronLeft />}
            onClick={() => setIsPreview(false)}
          />
          <Stack px={"sm"}>
            <div>
              <iframe
                src={shareUrl}
                width={"100%"}
                height={400}
                style={{ border: "none" }}
              ></iframe>
            </div>
          </Stack>
        </>
      )}
    </Modal>
  );
};
export default TestimonialShare;
