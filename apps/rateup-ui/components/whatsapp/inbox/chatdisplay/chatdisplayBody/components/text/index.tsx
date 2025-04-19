import { Text } from "@mantine/core";

import classes from "./styles.module.css";

interface Props {
  messageContent: string;
}
export default function WaInboxText(props: Props) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const parts = props?.messageContent?.split(urlRegex).filter(Boolean);

  return (
    <Text className={classes.text}>
      {parts?.map((text, index) =>
        urlRegex.test(text) ? (
          <a key={index} href={text} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ) : (
          <span key={index}>{text}</span>
        ),
      )}
    </Text>
  );
}
