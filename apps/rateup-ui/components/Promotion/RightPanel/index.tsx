import { Box } from "@mantine/core";

export default function RightPanelRoot(props) {
  return (
    <Box sx={{ flex: 3 }}>
      {props.children}
    </Box>
  )
}