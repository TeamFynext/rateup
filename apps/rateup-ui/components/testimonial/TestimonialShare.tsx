import {
  Code,
  CopyButton,
  Flex,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Title,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import {
  IconChevronLeft,
  IconConfetti,
  IconCopy,
  IconShare,
} from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import { useGetAllTestimonialsByCollection } from "../../backend/testimonials/testimonial.query";
import TestimonialCard from "./TestimonialCard";
import FormModalLayout from "../Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import { CopyLinkComponent } from "../Survey/ShareSurvey/ShareSurvey";
import Heading from "../styled/Heading/Heading";

const TestimonialShare = ({ filters }) => {
  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );
  // console.log("selectedCollectionId",selectedCollectionId)
  const { data: collection } =
    useGetAllTestimonialsByCollection(selectedCollectionId);
  // console.log("collection",collection)
  const [opened, { open, close }] = useDisclosure(false);
  const testimonials = collection?.testimonials?.map((t) => t?.testimonial);
  console.log("testimonials", testimonials);
  return (
    <Stack>
      <Flex justify={"flex-end"}>
        <RateupButtonBlue
          color="black"
          title="Share"
          leftIcon={<IconShare />}
          onClick={open}
        />
      </Flex>
      <SimpleGrid cols={3} mt={"lg"}>
        {testimonials?.map((testimonial, index) => (
          <TestimonialCard
            testimonial={testimonial}
            currentStyle={collection?.theme}
          />
        ))}
      </SimpleGrid>
      <TestimonialShareModal
        opened={opened}
        onClose={close}
        collectionId={collection?.id}
      />
    </Stack>
  );
};

const TestimonialShareModal = ({ opened, onClose, collectionId }) => {
  const shareUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/testimonial/${collectionId}`;
  const iframe = `<iframe src="${shareUrl}" width={"100%"} height={"400"}></iframe>`;

  const [isPreview, setIsPreview] = useState(false);

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
    >
      {!isPreview ? (
        <Stack>
          <Stack
            bg={"var(--tertiary-color)"}
            p={"xl"}
            c={"white"}
            justify="cenetr"
            align="center"
            style={{ borderRadius: "10px" }}
          >
            <Group gap={1}>
              <Stack gap={0}>
                <Title fw={400}>Share Your Testimonials</Title>
                <Title order={5} fw={400}>
                  {" "}
                  Follow the instruction to share your testimonials on your
                  website
                </Title>
              </Stack>
              <IconConfetti color="red" size={"20px"} />
            </Group>
          </Stack>
          <Stack px={100} py={"xl"}>
            <Stack>
              <Title order={5}> Add this widget to your website</Title>
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
                    title={copied ? "Copied code" : "Copy code"}
                    onClick={copy}
                    rightIcon={<IconCopy />}
                    styles={{ root: { width: "fit-content" } }}
                  />
                )}
              </CopyButton>
            </Stack>
            <Text c={"#494949"} fw={400}>
              Place this code in the desired section of your website to display
              the embed.
            </Text>
            <RateupButtonBlue
              title="Preview"
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
            title="Back"
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
