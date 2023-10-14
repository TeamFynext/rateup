import { Paper, PaperProps } from "@mantine/core";
export default function PaperLayout(props) {
  return (
    <Paper
      radius="lg"
      p="md"
      {...props}
      style={{
        ...props?.style,
        boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px",
        width: "100%",
        overflowX: "auto",
      }}
    />
  );
}
