import { Button, Group, Image, Text } from "@mantine/core";
import { IconCircleDashedCheck } from "@tabler/icons-react";
import { CornerUpLeft } from "lucide-react";

import { WaSendMessageBody } from "../../../../../../../../types/global";
import WaInboxText from "../../text";
import classes from "./styles.module.css";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractiveComponents(props: Readonly<Props>) {
  console.log("🚀 ~ WaInboxInteractiveComponents ~ props:", props);
  return (
    <>
      {props?.messageContent && (
        <Group gap={"xs"}>
          <IconCircleDashedCheck
            size={15}
            color="var(--mantine-primary-color-9"
          />
          <Text className={classes.responded_text}>
            {`${props.messageContent} responded`}
          </Text>
        </Group>
      )}
      {props?.interactiveBody?.header && (
        <WaInboxInteractiveHeader interactiveBody={props?.interactiveBody} />
      )}
      {props?.interactiveBody?.body && (
        <Text className={classes.body_text}>
          {props?.interactiveBody?.body?.text}
        </Text>
      )}
      {props?.interactiveBody?.footer && (
        <Text className={classes.footer_text}>
          {props?.interactiveBody?.footer?.text}
        </Text>
      )}
      {props?.interactiveBody?.action?.buttons?.map((button) => (
        <Button
          key={button?.reply?.id}
          leftSection={<CornerUpLeft size={16} />}
          variant="light"
        >
          {button?.reply?.title || button?.reply?.id}
        </Button>
      ))}

      {props?.interactiveBody?.action?.parameters?.flow_cta && (
        <Button variant="light">
          {props?.interactiveBody?.action?.parameters?.flow_cta}
        </Button>
      )}
    </>
  );
}
const WaInboxInteractiveHeader = (props: Omit<Props, "messageContent">) => {
  switch (props?.interactiveBody?.header?.type) {
    case "text":
      return (
        <Text className={classes.header_text}>
          {props?.interactiveBody?.header?.text}
        </Text>
      );
    case "image":
      return (
        <Image src={props?.interactiveBody?.header?.image?.link} mah={300} />
      );
  }
};
