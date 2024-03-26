import { Button, Divider, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import { WaTemplateFetchBodyComponent } from "../../../../../../../../types/global";
import { IconMessageReply } from "@tabler/icons-react";

export default function WaInboxTemplateComponents(
  props: WaTemplateFetchBodyComponent,
) {
  switch (props?.type) {
    case "HEADER":
      return <WaInboxTemplateHeader {...props} />;
    case "BODY":
      return <WaInboxTemplateBody {...props} />;
    case "FOOTER":
      return <WaInboxTemplateFooter {...props} />;
    case "BUTTONS":
      return <WaInboxTemplateButtons {...props} />;
  }
}
const WaInboxTemplateHeader = (props: WaTemplateFetchBodyComponent) => {
  switch (props?.format) {
    case "TEXT":
      return <Text className={classes.header_text}>{props?.text}</Text>;
  }
};

const WaInboxTemplateBody = (props: WaTemplateFetchBodyComponent) => {
  return <Text className={classes.body_text}>{props?.text}</Text>;
};

const WaInboxTemplateFooter = (props: WaTemplateFetchBodyComponent) => {
  return <Text className={classes.footer_text}>{props?.text}</Text>;
};

const WaInboxTemplateButtons = (props: WaTemplateFetchBodyComponent) => {
  return (
    <Stack gap={0}>
      {props?.buttons?.map((button, i) => (
        <>
          {i === 0 && <Divider />}
          <Button
            className={classes.reply_button}
            variant="transparent"
            leftSection={<IconMessageReply size={18} />}
          >
            {button?.text}
          </Button>
          {i !== props?.buttons?.length - 1 && <Divider />}
        </>
      ))}
    </Stack>
  );
};
