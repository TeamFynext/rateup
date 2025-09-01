"use client";

import {
  ActionIcon,
  Box,
  Container,
  Flex,
  Group,
  Image,
  MantineStyleProp,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCamera,
  IconCopy,
  IconLink,
  IconList,
  IconMicrophone,
  IconNote,
  IconPhone,
  IconPlus,
} from "@tabler/icons-react";

import { WHATSAPP_BUTTON_TYPE } from "../../utils/constants";
import classes from "./Message.module.css";

export interface ResponseMessageContainerProps {
  children: React.ReactNode;
  style?: MantineStyleProp;
  backgroundColor?: string;
}
export function ResponseMessageContainer({
  children,
  style,
  backgroundColor = "#fff",
}: ResponseMessageContainerProps) {
  return (
    <Container
      px="10px"
      py="6px"
      className={`${classes.common} ${classes.response}`}
      style={{
        "--color": backgroundColor,
        ...style,
      }}
    >
      {children}
    </Container>
  );
}

export interface SentMessageContainerProps {
  children: React.ReactNode;
  style?: MantineStyleProp;
  backgroundColor?: string;
}
export function SentMessageContainer({
  children,
  style,
  backgroundColor = "#d9fdd3",
}: SentMessageContainerProps) {
  return (
    <Container
      p="4px"
      className={`${classes.common} ${classes.sent}`}
      style={{
        "--color": backgroundColor,
        ...style,
      }}
    >
      {children}
    </Container>
  );
}

interface QuickReplyButtonProps {
  text: string;
  style?: MantineStyleProp;
  onClick?: any;
  type?: any;
}
export function QuickReplyButton({
  text,
  style,
  onClick,
  type,
}: QuickReplyButtonProps) {
  const theme = useMantineTheme();
  return (
    <Box
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        cursor: "pointer",
        width: "80%",
        zIndex: 1,
        ...style,
      }}
      onClick={onClick || (() => {})}
      p="6px"
    >
      <Group justify="center" c={theme.colors.blue[5]} gap={5}>
        {getIcon(type)}
        <Text
          style={{
            wordBreak: "break-all",
          }}
        >
          {text}
        </Text>
      </Group>
    </Box>
  );
}

const getIcon = (type) => {
  switch (type) {
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return <IconPhone size={14} />;
    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return <IconCopy size={14} />;
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return <IconLink size={14} />;
    default:
      return <></>;
  }
};

interface WaListButonProps {
  text?: string;
  style?: MantineStyleProp;
  onClick?: any;
}
export function WaListButton({
  text = "View Options",
  style = {},
  ...props
}: WaListButonProps) {
  const theme = useMantineTheme();
  return (
    <Group
      gap={"xs"}
      justify="center"
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        cursor: "pointer",
        width: "80%",
        ...style,
      }}
      p="6px"
      pr="24px"
      {...props}
    >
      <ActionIcon variant="transparent" c={theme.colors.blue[5]}>
        <IconList />
      </ActionIcon>

      <Text c={theme.colors.blue[5]}>{text}</Text>
    </Group>
  );
}

export function SendMessageMock() {
  return (
    <Group
      p="2px"
      wrap="nowrap"
      bg={"var(--wa-gray)"}
      style={{
        borderRadius: "0px 0px 12px 12px",
      }}
      gap={0}
    >
      <Flex mb={"md"}>
        <ActionIcon variant="transparent" c="var(--wa-blue)">
          <IconPlus size={15} />
        </ActionIcon>
        <TextInput
          radius={"md"}
          size="20px"
          mt={4}
          readOnly
          rightSection={
            <ActionIcon variant="transparent" c="var(--wa-blue)">
              <IconNote size={15} />
            </ActionIcon>
          }
        />
        <ActionIcon variant="transparent" c="var(--wa-blue)">
          <IconCamera size={15} />
        </ActionIcon>
        <ActionIcon variant="transparent" c="var(--wa-blue)">
          <IconMicrophone size={15} />
        </ActionIcon>
      </Flex>
    </Group>
  );
}

export function WaMessageHeader(props) {
  return <Text fw={"bold"} {...props} />;
}
export function WaMessageBody(props) {
  return <Text {...props} />;
}
export function WaMessageFooter(props) {
  return <Text fz={"sm"} c="dimmed" {...props} />;
}

interface WaResponseMessageProps {
  header?: string;
  body: string;
  footer?: string;
  quickReplyButtons?: string[] | Choice[];
  image?: string; // url of image
}
export function WaResponseMessage({
  body,
  header = "",
  footer = "",
  quickReplyButtons = [],
  image,
}: WaResponseMessageProps) {
  if (quickReplyButtons.length > 3) {
    throw new Error(
      "Too many quick reply buttons. WhatsApp only supports up to 3 quick reply buttons.",
    );
  }
  return (
    <Stack
      style={{
        // TODO: find out why zIndex is needed
        zIndex: 1,
      }}
      gap={3}
      p={0}
    >
      <ResponseMessageContainer>
        <Stack gap={4}>
          <Image src={image} radius={6} />
          {header && <WaMessageHeader>{header}</WaMessageHeader>}
          {body && <WaMessageBody>{body}</WaMessageBody>}
          {footer && <WaMessageFooter>{footer}</WaMessageFooter>}
        </Stack>
      </ResponseMessageContainer>
      {/* update changes in whatsapp */}
      {quickReplyButtons.map((text, i) => (
        <QuickReplyButton
          key={i}
          text={typeof text === "string" ? text : text.value}
        />
      ))}
    </Stack>
  );
}

interface WaListMessageProps {
  header?: string;
  body: string;
  footer?: string;
  openList: any;
}
export function WaListMessage({
  body,
  header = "",
  footer = "",
  openList,
}: WaListMessageProps) {
  return (
    <Stack
      style={{
        // TODO: find out why zIndex is needed
        zIndex: 1,
      }}
      gap={3}
      p={0}
    >
      <ResponseMessageContainer>
        <Stack gap={4}>
          {header && <WaMessageHeader>{header}</WaMessageHeader>}
          {body && <WaMessageBody>{body}</WaMessageBody>}
          {footer && <WaMessageFooter>{footer}</WaMessageFooter>}
        </Stack>
      </ResponseMessageContainer>
      <WaListButton
        onClick={() => {
          console.log("clicked");
          openList();
        }}
      />
    </Stack>
  );
}

interface WaSendMessageProps {
  body: string;
}
export function WaSentMessage({ body }: WaSendMessageProps) {
  return (
    <SentMessageContainer>
      <WaMessageBody p="2px" pl="8px">
        {body}
      </WaMessageBody>
    </SentMessageContainer>
  );
}
