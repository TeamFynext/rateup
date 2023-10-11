import {
  Title,
  TitleProps,
  MantineStyleProp,
  Stack,
  Text,
} from "@mantine/core";
import { GilroySemibold } from "../../../public/fonts";
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
  fontFamily: GilroySemibold.style.fontFamily,
};
const subTitleStyle: MantineStyleProp = {
  fontFamily: GilroySemibold.style.fontFamily,
};
const labelStyle: MantineStyleProp = {
  fontFamily: GilroySemibold.style.fontFamily,
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
      {label && <Text title={label}>{label}</Text>}
    </Stack>
  );
}
