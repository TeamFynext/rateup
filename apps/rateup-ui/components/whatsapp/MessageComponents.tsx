import { ActionIcon, Box, Container, Group, MantineStyleProp, Stack, Text, TextInput, useMantineTheme } from "@mantine/core";
import classes from './Message.module.css'
import { IconMoodHappy, IconSend } from "@tabler/icons-react";

interface ResponseMessageContainerProps {
  children: React.ReactNode;
  style?: MantineStyleProp;
}
export function ResponseMessageContainer({ children, style }: ResponseMessageContainerProps) {
  return (
    <Container
      px="10px"
      py="6px"
      className={classes.container1}
      style={style}
    >
      {children}
    </Container >
  )
}

interface SentMessageContainer {
  children: React.ReactNode;
  style?: MantineStyleProp
}
export function SentMessageContainer({ children, style = {} }) {
  return (
    <Container
      px="10px"
      py="6px"
      className={classes.container}
      style={style}
    >
      {children}
    </Container >
  )
}

interface QuickReplyButtonProps {
  text: string;
  style?: MantineStyleProp
}
export function QuickReplyButton({ text, style = {} }: QuickReplyButtonProps) {
  const theme = useMantineTheme()
  return (
    <Box
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        ...style
      }}
      p="6px"
    >
      <Text
        style={{ textAlign: 'center' }}
        c={theme.colors.blue[5]}>
        {text}
      </Text>
    </Box >
  )
}

export function SendMessageMock() {
  return (
    <Group
      p="sm"
      wrap="nowrap"
    >
      <ActionIcon
        variant="transparent"
        c="dimmed"
      >
        <IconMoodHappy />
      </ActionIcon>
      <TextInput
        radius={"md"}
        placeholder="Type a message"
        style={{
          flexGrow: 1,
        }}
      />
      <ActionIcon
        variant="transparent"
        c="dimmed"
      >
        <IconSend />
      </ActionIcon>
    </Group>
  )
}

export function WaMessageHeader(props) {
  return <Text fw={'bold'} {...props} />
}
export function WaMessageBody(props) {
  return <Text {...props} />
}
export function WaMessageFooter(props) {
  return <Text fz={'sm'} c="dimmed" {...props} />
}

interface WaResponseMessageProps {
  header?: string;
  body: string;
  footer?: string;
  quickReplyButtons?: string[];
}
export function WaResponseMessage({ body, header = "", footer = "", quickReplyButtons = [] }: WaResponseMessageProps) {
  if (quickReplyButtons.length > 3) {
    throw new Error("Too many quick reply buttons. WhatsApp only supports up to 3 quick reply buttons.");
  }
  return (
    <Stack
      style={{
        // TODO: find out why zIndex is needed
        zIndex: 1,
        width: '250px'
      }}
      gap={3}
      p={0}
    >
      <ResponseMessageContainer>
        <Stack
          gap={4}
        >
          {header && <WaMessageHeader>{header}</WaMessageHeader>}
          {body && <WaMessageBody>{body}</WaMessageBody>}
          {footer && <WaMessageFooter>{footer}</WaMessageFooter>}
        </Stack>
      </ResponseMessageContainer>
      {
        quickReplyButtons.map((text, i) => (
          <QuickReplyButton key={i} text={text} />
        ))
      }
    </Stack>
  )
}

interface WaSendMessageProps {
  body: string;
}
export function WaSentMessage({ body }: WaSendMessageProps) {
  return (
    <SentMessageContainer>
      <WaMessageBody>{body}</WaMessageBody>
    </SentMessageContainer>
  )
}