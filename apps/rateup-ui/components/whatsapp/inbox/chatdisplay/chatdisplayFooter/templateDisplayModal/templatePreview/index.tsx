import { useEffect, useState } from "react";

import { Badge, Box, Group, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSend } from "@tabler/icons-react";
import { UseMutationResult } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useImmer } from "use-immer";

import { WaGetMessagesBody } from "../../../../../../../backend/whatsapp/inbox/message/wamessage.api";
import { useWaTemplateById } from "../../../../../../../backend/whatsapp/whatsapp.query";
import { WaTemplateFetchBody } from "../../../../../../../types/global";
import { uploadFile } from "../../../../../../../utils/file-upload/upload";
import { validateInboxTemplateSending } from "../../../../../../../utils/whatsapp/inbox";
import { RateupButtonPrimary } from "../../../../../../Button/RateupButtons";
import WaInboxTemplate from "../../../chatdisplayBody/components/template";
import WaInboxSingleMessageLayout from "../../../chatdisplayBody/layout/singleMessageLayout";
import WaTemplateFormElements from "./formElements";
import classes from "./styles.module.css";

interface Props {
  template: WaTemplateFetchBody;
  sendTemplate: UseMutationResult<
    AxiosResponse<any, any>,
    any,
    {
      templateId: string;
      parameterData: any;
      teamId: string;
      whatsappSettingsPhoneId: string;
    },
    unknown
  >;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  onClose: () => void;
  teamId: string;
  whatsappSettingsPhoneId: string;
}
export default function WaInboxTemplatePreview(props: Props) {
  const [parameterData, setParameterData] = useImmer<any>([]);
  const [loading, setLoading] = useState(false);

  const { data: dbTemplate } = useWaTemplateById(props?.selectedTemplateId);

  const isMobile = useMediaQuery("(max-width: 720px)");

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
          let filename = fileKey?.split("-")?.slice(1)?.join("-") ?? fileKey;
          const isDocument = item?.parameters?.[0]?.type === "document";

          return {
            ...item,
            parameters: item.parameters.map((param, paramIndex) =>
              paramIndex === 0
                ? {
                    ...param,
                    [item?.parameters[0]?.type]: {
                      ...param[item?.parameters[0]?.type],
                      link: `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`,
                      ...(isDocument && { filename }),
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
    setLoading(true);
    const modifiedParamData = await handleFilesIfAny(parameterData);
    props?.sendTemplate?.mutate({
      templateId: props?.selectedTemplateId,
      parameterData: modifiedParamData,
      teamId: props?.teamId,
      whatsappSettingsPhoneId: props?.whatsappSettingsPhoneId,
    });
    setLoading(false);
    props?.onClose();
  }
  useEffect(() => {
    setParameterData(() => []);
  }, [props?.selectedTemplateId]);

  if (isMobile) {
    return (
      <Box pl={"1rem"}>
        <RateupButtonPrimary
          loading={loading}
          disabled={validateInboxTemplateSending(
            props?.template?.components,
            parameterData,
            dbTemplate?.defaultValues,
          ).includes(false)}
          ml="auto"
          onClick={handleSendTemplate}
          title="Send"
          rightIcon={<IconSend />}
        />
      </Box>
    );
  } else {
    return (
      <Stack className={classes.wrapper}>
        <Group className={classes.name_sendbutton_wrapper}>
          <Group className={classes["name-badges-container"]}>
            <Text className={classes.name}>{props?.template?.name}</Text>
            <Group>
              <Badge variant="outline">{props?.template?.language}</Badge>
              <Badge variant="outline">{props?.template?.category}</Badge>
              <Badge variant="outline">{props?.template?.status}</Badge>
            </Group>
          </Group>
          <RateupButtonPrimary
            loading={loading}
            disabled={validateInboxTemplateSending(
              props?.template?.components,
              parameterData,
              dbTemplate?.defaultValues,
            )?.includes(false)}
            ml="auto"
            onClick={handleSendTemplate}
            title="Send"
            rightIcon={<IconSend />}
          />
        </Group>
        <Stack className={classes.inner}>
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
          <WaTemplateFormElements
            setParameterData={setParameterData}
            template={props?.template}
          />
        </Stack>
      </Stack>
    );
  }
}
