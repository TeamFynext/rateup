import { Box, Center, Container, Text, useMantineTheme } from "@mantine/core";
import classes from './Message.module.css'
export function ResponseMessageContainer({ children, style }) {
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

export function SentMessageContainer({ children, style }) {
  const color = "#00a884";
  return (
    <Container
      p="4px"
      className={classes.container}
      style={style}
    >
      {children}
    </Container >
  )
}

export function QuickReplyButton({ text, sx }) {
  const theme = useMantineTheme()
  return (
    <Box
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        ...sx
      }}
      p="6px"
    >
      <Text style={{ textAlign: 'center' }}
        c={theme.colors.blue[5]}>
        {text}
      </Text>
    </Box >
  )
}