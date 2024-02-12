import {
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
  Center,
  Image,
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
import { useContext, useState } from "react";
import SelectedTestimonialCollectionContext from "../../context/SelectedCollectionContext";
import TestimonialCard from "./TestimonialCard";
import { useDisclosure } from "@mantine/hooks";
import NothingFound from "../NothingFound/NothingFound";

const TestimonialShare = ({ selectedTestimonials, currentStyle }) => {
  const { selectedCollectionId } = useContext(
    SelectedTestimonialCollectionContext,
  );

  const [opened, { open, close }] = useDisclosure(false);

  const filteredTestimonials = selectedTestimonials;
  if (filteredTestimonials?.length <= 0)
    return (
      <Center mt={150}>
        <NothingFound text={"No testimonials found"} />
      </Center>
    );

  return (
    <Stack pt={"xl"}>
      <Flex justify={"flex-end"}>
        <RateupButtonBlue
          color="black"
          title="Share"
          leftIcon={<IconShare />}
          onClick={open}
        />
      </Flex>
      <SimpleGrid cols={3} mt={"lg"}>
        {filteredTestimonials?.map((testimonial, index) => (
          <TestimonialCard
            testimonial={testimonial}
            currentStyle={currentStyle}
            key={testimonial?.id}
          />
        ))}
      </SimpleGrid>
      <TestimonialShareModal
        opened={opened}
        onClose={close}
        collectionId={selectedCollectionId}
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
      zIndex={400}
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
            <Group gap={"xs"}>
              <Stack gap={0}>
                <Title fw={400}>Share Your Testimonials</Title>
                <Title order={5} fw={400}>
                  {" "}
                  Follow the instruction to share your testimonials on your
                  website
                </Title>
              </Stack>
              <Image src={`../../images/Party Svg Icon.svg`} w={60} h={60} />
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
