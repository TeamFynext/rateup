import { Anchor, Text } from "@mantine/core";

import { parseWhatsAppToReact } from "@/components/RichTextEditor/waTextEditor";

import classes from "./styles.module.css";

interface Props {
  messageContent: string;
}
export default function WaInboxText(props: Props) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const message =
    typeof props?.messageContent === "string" ? props.messageContent : "";
  const parts = message.split(urlRegex).filter(Boolean);

  return (
    <Text className={classes.text} maw={"300px"} component="span">
      {parts.map((text, index) =>
        urlRegex.test(text) ? (
          <Anchor
            className={classes.text}
            key={index}
            href={text}
            target="_blank"
            rel="noopener noreferrer"
          >
            {text}
          </Anchor>
        ) : (
          <span key={index}>{parseWhatsAppToReact(text) || text}</span>
        ),
      )}
    </Text>
  );
}
