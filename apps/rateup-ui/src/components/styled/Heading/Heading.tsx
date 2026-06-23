import type { MantineStyleProp, TitleProps } from "@mantine/core";
import { Stack, Text, Title } from "@mantine/core";

interface HeadingPropsInterface {
  title?: string;
  subtitle?: string;
  label?: string;
  titleprops?: TitleProps;
}
const titleStyle: MantineStyleProp = {
  fontSize: "32px",
  width: 300,
  maxWidth: "300px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
export default function Heading({
  label,
  subtitle,
  title,
  titleprops,
}: HeadingPropsInterface) {
  return (
    <Stack gap={5} p={0}>
      {title && (
        <Title order={2} style={titleStyle} {...titleprops} title={title}>
          {title}
        </Title>
      )}
      {subtitle && (
        <Title order={3} {...titleprops} title={subtitle}>
          {subtitle}
        </Title>
      )}
      {label && (
        <Text title={label} c="dark.0">
          {label}
        </Text>
      )}
    </Stack>
  );
}
