import { Button, Divider, Image, Stack, Text } from "@mantine/core";
import classes from "./styles.module.css";
import {
  WaTemplateComponent,
  WaTemplateFetchBodyComponent,
} from "../../../../../../../../types/global";
import { IconMessageReply } from "@tabler/icons-react";
import React from "react";

interface Props {
  templateComponent: WaTemplateFetchBodyComponent;
  parameterData: WaTemplateComponent;
}
export default function WaInboxTemplateComponents(props: Props) {
  switch (props?.templateComponent?.type) {
    case "HEADER":
      return (
        <WaInboxTemplateHeader
          parameterData={props?.parameterData}
          templateComponent={props?.templateComponent}
        />
      );
    case "BODY":
      return <WaInboxTemplateBody {...props?.templateComponent} />;
    case "FOOTER":
      return <WaInboxTemplateFooter {...props?.templateComponent} />;
    case "BUTTONS":
      return <WaInboxTemplateButtons {...props?.templateComponent} />;
  }
}
const WaInboxTemplateHeader = (props: Props) => {
  function getUrlIfParameterIsPresent(): string {
    if (props?.parameterData) {
      if (
        props?.parameterData?.parameters[0]?.[
          props?.templateComponent?.format?.toLowerCase()
        ]?.link instanceof File
      ) {
        return URL.createObjectURL(
          props?.parameterData?.parameters[0]?.[
            props?.templateComponent?.format?.toLowerCase()
          ]?.link,
        );
      } else {
        return props?.parameterData?.parameters[0]?.[
          props?.templateComponent?.format?.toLowerCase()
        ]?.link;
      }
    } else {
      return props?.templateComponent?.example?.header_handle[0];
    }
  }
  switch (props?.templateComponent?.format) {
    case "TEXT":
      return (
        <Text className={classes.header_text}>
          {props?.templateComponent?.text}
        </Text>
      );
    case "IMAGE":
      return <Image src={getUrlIfParameterIsPresent()} mah={300} />;
    case "DOCUMENT":
      return <iframe src={getUrlIfParameterIsPresent()} />;
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
        <React.Fragment key={i}>
          {i === 0 && <Divider />}
          <Button
            className={classes.reply_button}
            variant="transparent"
            leftSection={<IconMessageReply size={18} />}
          >
            {button?.text}
          </Button>
          {i !== props?.buttons?.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </Stack>
  );
};
