import { ActionIcon, Box, Center, Container, Group, MantineStyleProp, Stack, Text, TextInput, useMantineTheme } from "@mantine/core";
import classes from './Message.module.css'
import { IconList, IconMoodHappy, IconSend } from "@tabler/icons-react";
export interface ResponseMessageContainerProps {
  children: React.ReactNode;
  style?: MantineStyleProp;
  backgroundColor?: string;
}
export function ResponseMessageContainer({ children, style, backgroundColor = "#fff" }: ResponseMessageContainerProps) {
  return (
    <Container
      px="10px"
      py="6px"
      className={`${classes.common} ${classes.response}`}
      style={{
        '--color': backgroundColor,
        ...style
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
export function SentMessageContainer({ children, style, backgroundColor }: SentMessageContainerProps) {
  return (
    <Container
      p="4px"
      className={`${classes.common} ${classes.sent}`}
      style={{
        '--color': backgroundColor,
        ...style
      }}
    >
      {children}
    </Container>
  );
}

interface QuickReplyButtonProps {
  text: string;
  style?: MantineStyleProp;
}
export function QuickReplyButton({ text, style = {} }: QuickReplyButtonProps) {
  const theme = useMantineTheme();
  return (
    <Box
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        cursor: "pointer",
        ...style,
      }}
      p="6px"
    >
      <Text style={{ textAlign: "center" }} c={theme.colors.blue[5]}>
        {text}
      </Text>
    </Box>
  );
}

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
    <Group p="sm" wrap="nowrap">
      <ActionIcon variant="transparent" c="dimmed">
        <IconMoodHappy />
      </ActionIcon>
      <TextInput
        radius={"md"}
        placeholder="Type a message"
        style={{
          flexGrow: 1,
        }}
      />
      <ActionIcon variant="transparent" c="dimmed">
        <IconSend />
      </ActionIcon>
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
  quickReplyButtons?: string[];
}
export function WaResponseMessage({
  body,
  header = "",
  footer = "",
  quickReplyButtons = [],
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
        width: "250px",
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
      {quickReplyButtons.map((text, i) => (
        <QuickReplyButton key={i} text={text} />
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
        width: "250px",
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
      <WaMessageBody>{body}</WaMessageBody>
    </SentMessageContainer>
  );
}
