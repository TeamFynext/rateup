import { Badge, Group, Stack, Text } from "@mantine/core";
import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { WaTemplateFetchBody } from "../../../../../../../types/global";
import WaInboxTemplate from "../../../chatdisplayBody/components/template";
import WaInboxSingleMessageLayout from "../../../chatdisplayBody/layout/singleMessageLayout";
import classes from "./styles.module.css";
import { UseMutationResult } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { RateupButtonPrimary } from "../../../../../../Button/RateupButtons";
import { IconSend } from "@tabler/icons-react";
import WaTemplateFormElements from "./formElements";
import { useImmer } from "use-immer";
import { uploadFile } from "../../../../../../../utils/file-upload/upload";
import { validateInboxTemplateSending } from "../../../../../../../utils/whatsapp/inbox";
import { useEffect } from "react";
interface Props {
  template: WaTemplateFetchBody;
  sendTemplate: UseMutationResult<
    AxiosResponse<any, any>,
    any,
    {
      templateId: string;
      parameterData: any;
    },
    unknown
  >;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  onClose: () => void;
}
export default function WaInboxTemplatePreview(props: Props) {
  const [parameterData, setParameterData] = useImmer<any>([]);
  async function handleFilesIfAny(data: Array<any>) {
    const newData = await Promise.all(
      data.map(async (item, index) => {
        if (
          item?.type === "header" &&
          ["image", "video", "document"].includes(item?.parameters[0]?.type)
        ) {
          const fileKey = await uploadFile(
            item?.parameters[0]?.[item?.parameters[0]?.type]?.link,
          );
          return {
            ...item,
            parameters: item.parameters.map((param, paramIndex) =>
              paramIndex === 0
                ? {
                    ...param,
                    [item?.parameters[0]?.type]: {
                      ...param[item?.parameters[0]?.type],
                      link: `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`,
                    },
                  }
                : param,
            ),
          };
        } else {
          return item;
        }
      }),
    );
    return newData;
  }
  async function handleSendTemplate() {
    const modifiedParamData = await handleFilesIfAny(parameterData);
    props?.sendTemplate?.mutate({
      templateId: props?.selectedTemplateId,
      parameterData: modifiedParamData,
    });
  }
  useEffect(() => {
    setParameterData(() => []);
  }, [props?.selectedTemplateId]);
  return (
    <Stack className={classes.wrapper}>
      <Group className={classes.name_sendbutton_wrapper}>
        <Group>
          <Text className={classes.name}>{props?.template?.name}</Text>
          <Group>
            <Badge variant="outline">{props?.template?.language}</Badge>
            <Badge variant="outline">{props?.template?.category}</Badge>
            <Badge variant="outline">{props?.template?.status}</Badge>
          </Group>
        </Group>
        <RateupButtonPrimary
          disabled={validateInboxTemplateSending(
            props?.template?.components,
            parameterData,
          ).includes(false)}
          ml="auto"
          onClick={handleSendTemplate}
          title="Send"
          rightIcon={<IconSend />}
        />
      </Group>
      <Group className={classes.inner}>
        <WaTemplateFormElements
          setParameterData={setParameterData}
          template={props?.template}
        />
        <WaInboxSingleMessageLayout
          forPreview
          exchangeProcess="send"
          messageObject={{} as WaGetMessagesBody}
        >
          <WaInboxTemplate
            parameters={parameterData}
            templateBody={props?.template}
          />
        </WaInboxSingleMessageLayout>
      </Group>
    </Stack>
  );
}
