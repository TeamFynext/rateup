import { Button, Image, Text } from "@mantine/core";
import { WaSendMessageBody } from "../../../../../../../../types/global";
import classes from "./styles.module.css";
import WaInboxText from "../../text";

interface Props {
  interactiveBody: WaSendMessageBody["interactive"];
  messageContent: string;
}
export default function WaInboxInteractiveComponents(props: Props) {
  return (
    <>
      {props?.messageContent && (
        <WaInboxText messageContent={`${props.messageContent} responded`} />
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
      {props?.interactiveBody?.action && (
        <Button className={classes.button}>
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
