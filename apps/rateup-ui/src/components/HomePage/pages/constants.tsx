import { Text, Title } from "@mantine/core";

import styles from "../index.module.css";

const featuresH1ClassName = styles["illustration-txt-section-heading"];
const descriptionPClassName = styles["illustration-txt-section-text-para"];
const descriptionPSpanClassName = styles["bold-span"];
const headingClassName = styles["heading-with-small-blue-span-and-normal-span"];

export const Heading = ({ children }) => (
  <Title order={2} className={`${featuresH1ClassName} ${headingClassName}`}>
    {children}
  </Title>
);

export const DescriptionP = ({ children }) => (
  <Text className={descriptionPClassName}>{children}</Text>
);

export const DescriptionPSpan = ({ text }) => (
  <span className={descriptionPSpanClassName}>{text}</span>
);

export const videoClassName = styles["illustration-txt-section-video"];
