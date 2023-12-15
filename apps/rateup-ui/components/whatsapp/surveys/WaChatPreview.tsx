import {
  useMantineTheme,
  Title,
  Stack,
  Transition,
  Center,
  Box,
  Group,
  ActionIcon,
  Text,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { Overlay } from "pigeon-maps";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { SendMessageMock } from "../MessageComponents";
import { WaQuestionPreview } from "./WaQuestionPreview";
import whatsappStyles from "../whatsapp.module.css";

export const WhatsappChatPreview = ({ selectedQ }) => {
  const [listOpened, { open, close }] = useDisclosure(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const theme = useMantineTheme();
  const sections = selectedQ?.sections?.[selectedLanguage];
  return (
    <>
      <Title
        p="sm"
        style={{
          backgroundColor: theme.colors["whatsapp-green"][7],
          textAlign: "center",
        }}
        order={3}
        c={"white"}
      >
        Preview
      </Title>
      <ScrollArea h={"100%"}>
        <Stack
          className={whatsappStyles.chatBg}
          px="xs"
          py="sm"
          justify="end"
          mih={480}
        >
          {selectedQ && (
            <WaQuestionPreview question={selectedQ} openList={open} />
          )}
        </Stack>
      </ScrollArea>
      <SendMessageMock />
      <Transition mounted={listOpened}>
        {(ts) => (
          <Overlay
            style={{
              ...ts,
            }}
          />
        )}
      </Transition>
      <Transition mounted={listOpened} transition={"slide-up"}>
        {(transitionStyle1) => (
          <Overlay
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "end",
            }}
          >
            <Stack
              style={{
                backgroundColor: "white",
                ...transitionStyle1,
              }}
              pt="4px"
              p={0}
              mah={"70%"}
            >
              <Center>
                <Box
                  h="5px"
                  w="25px"
                  style={{
                    backgroundColor: "gray",
                    borderRadius: "1000px",
                  }}
                />
              </Center>
              <Group
                p="0"
                style={{
                  position: "relative",
                }}
                justify="center"
              >
                <ActionIcon
                  variant="transparent"
                  c="dark"
                  size={"sm"}
                  style={{
                    position: "absolute",
                    left: "4px",
                  }}
                  onClick={close}
                >
                  <IconX />
                </ActionIcon>
                <Text
                  style={{
                    justifySelf: "center",
                  }}
                >
                  View Options
                </Text>
              </Group>
              <Stack
                px={"xs"}
                style={{
                  overflow: "auto",
                }}
              >
                {sections?.map((section) => {
                  return <WaSectionDisplay section={section} />;
                })}
              </Stack>
              <Center>
                <Text c="dimmed" fz="xs" p="sm">
                  Tap to select an item
                </Text>
              </Center>
            </Stack>
          </Overlay>
        )}
      </Transition>
    </>
  );
};

function WaSectionDisplay({ section }) {
  const theme = useMantineTheme();
  return (
    <>
      <Text c={theme.colors.blue[9]}>{section.title}</Text>
      <Stack>
        {section.rows.map((item) => (
          <Group justify="space-between">
            <Box>
              <Text>{item.title}</Text>
              <Text c="dimmed">{item.description}</Text>
            </Box>
            <Box
              h="15px"
              w="15px"
              style={{
                border: "2px solid gray",
                borderRadius: "100px",
              }}
            />
          </Group>
        ))}
      </Stack>
    </>
  );
}
