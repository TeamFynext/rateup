import { Box, Center, Container, Text, useMantineTheme } from "@mantine/core";

export function ResponseMessageContainer({ children, sx }) {
  return (
    <Container
      px="10px"
      py="6px"
      sx={{
        backgroundColor: "white",
        width: "250px",
        borderRadius: "5px",
        borderTopLeftRadius: "0px",
        position: "relative",
        minHeight: "40px",
        '&:before': {
          content: `""`,
          width: "0",
          height: "0",
          position: "absolute",
          borderLeft: "10px solid white",
          borderRight: "10px solid transparent",
          borderTop: "10px solid white",
          borderBottom: "10px solid transparent",
          left: "-10px",
          top: "0",
          rotate: "90deg",
          zIndex: "1",
        },
        '& > *': {
          position: "relative",
          zIndex: "2",
        },
        ...sx
      }}

    >
      {children}
    </Container >
  )
}

export function SentMessageContainer({ children }) {
  const color = "#00a884";
  return (
    <Container
      p="4px"
      sx={{
        width: "250px",
        borderRadius: "8px",
        borderTopLeftRadius: "0px",
        position: "relative",
        backgroundColor: color,
        '&:before': {
          content: `""`,
          width: "0",
          height: "0",
          position: "absolute",
          borderLeft: "10px solid " + color,
          borderRight: "10px solid transparent",
          borderTop: "10px solid " + color,
          borderBottom: "10px solid transparent",
          right: "-10px",
          top: "0",
        }
      }}
    >
      {children}
    </Container >
  )
}

export function QuickReplyButton({ text, sx }) {
  const theme = useMantineTheme()
  return (
    <Box
      sx={{
        backgroundColor: "white",
        borderRadius: "8px",
        ...sx
      }}
      p="6px"
    >
      <Text align="center" c={theme.colors.blue[5]}>
        {text}
      </Text>
    </Box >
  )
}