import { IconSend } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImmer } from "use-immer";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";
import { WaTemplateComponentType } from "@/types/enums.ts";
import type { WaTemplateComponent, WaTemplateFetchBody } from "@/types/global";
import { WaTemplateSupportedParameters } from "@/types/global";
import { uploadFile } from "@/utils/file-upload/upload.ts";
import { validateInboxTemplateSending } from "@/utils/whatsapp/inbox.ts";

import WaInboxTemplate from "../../../chatdisplayBody/components/template/index.tsx";
import WaInboxSingleMessageLayout from "../../../chatdisplayBody/layout/singleMessageLayout/index.tsx";
import WaTemplateFormElements from "./formElements/index.tsx";

interface Props {
  template: WaTemplateFetchBody;
  sendTemplate: UseMutationResult<
    AxiosResponse<unknown>,
    Error,
    {
      templateId: string;
      parameterData: WaTemplateComponent[];
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

/** The parameter kinds a template header can carry; each holds a `{ link }`. */
type MediaParameterType =
  | WaTemplateSupportedParameters.IMAGE
  | WaTemplateSupportedParameters.VIDEO
  | WaTemplateSupportedParameters.DOCUMENT;

const isMediaParameter = (
  type: WaTemplateSupportedParameters | undefined,
): type is MediaParameterType =>
  type === WaTemplateSupportedParameters.IMAGE ||
  type === WaTemplateSupportedParameters.VIDEO ||
  type === WaTemplateSupportedParameters.DOCUMENT;

export function WaInboxTemplatePreviewNew(props: Props) {
  const [parameterData, setParameterData] = useImmer<WaTemplateComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const { t: translations } = useTranslation();

  const { data: dbTemplate } = useWaTemplateById(props?.selectedTemplateId);

  async function handleFilesIfAny(data: WaTemplateComponent[]): Promise<WaTemplateComponent[]> {
    const newData = await Promise.all(
      data.map(async (item) => {
        const media = item?.parameters?.[0];
        const mediaType = media?.type;
        if (item?.type !== WaTemplateComponentType.header || !isMediaParameter(mediaType)) {
          return item;
        }

        // Only a freshly picked file needs uploading; an already-uploaded header carries its URL.
        const link = media[mediaType]?.link;
        if (!(link instanceof File)) return item;

        const fileKey = await uploadFile(link);
        const filename = fileKey?.split("-")?.slice(1)?.join("-") ?? fileKey;
        const isDocument = mediaType === WaTemplateSupportedParameters.DOCUMENT;

        return {
          ...item,
          parameters: item.parameters.map((param, paramIndex) =>
            paramIndex === 0
              ? {
                  ...param,
                  [mediaType]: {
                    ...param[mediaType],
                    link: `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${fileKey}`,
                    ...(isDocument && { filename }),
                  },
                }
              : param,
          ),
        };
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

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="h-[42vh] sm:overflow-x-hidden overflow-y-auto w-full">
        <WaInboxSingleMessageLayout
          forPreview
          exchangeProcess="send"
          messageObject={{} as WaGetMessagesBody}
        >
          <WaInboxTemplate parameters={parameterData} templateBody={props?.template} />
        </WaInboxSingleMessageLayout>
        <WaTemplateFormElements setParameterData={setParameterData} template={props?.template} />
      </div>
      <div className="w-full flex items-center justify-end">
        <button
          className="px-4 py-2 rounded-md bg-green-500 flex items-center justify-center gap-1 disabled:opacity-50"
          onClick={handleSendTemplate}
          disabled={validateInboxTemplateSending(
            props?.template?.components,
            parameterData,
            dbTemplate?.defaultValues,
          )?.includes(false)}
        >
          {!loading && <IconSend color="white" size={18} />}
          <span className="text-white font-semibold text-md">
            {loading ? translations("Sending") : translations("Send Template")}
          </span>
        </button>
      </div>
    </div>
  );
}
