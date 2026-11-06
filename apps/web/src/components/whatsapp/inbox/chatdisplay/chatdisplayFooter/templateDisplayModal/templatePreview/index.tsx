import { IconArrowLeft, IconSend } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useImmer } from "use-immer";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { NewPendingMessage } from "@/store/pendingMessages.ts";
import { WaTemplateComponentType } from "@/types/enums.ts";
import { WaTemplateSupportedParameters } from "@/types/enums.ts";
import type { WaTemplateComponent, WaTemplateFetchBody } from "@/types/global";
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
      /** The card to draw in the thread while the send is in flight. */
      pending?: NewPendingMessage;
    },
    unknown
  >;
  selectedTemplateId: string;
  onClose: () => void;
  /** Back to the template list, on a phone where the two do not fit side by side. */
  onBack: () => void;
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
      // The card goes into the thread as the request goes out, so closing this dialog
      // leaves the template on screen rather than an unchanged conversation.
      pending: {
        kind: "template",
        template: props.template,
        parameters: modifiedParamData,
      },
    });
    setLoading(false);
    props?.onClose();
  }

  const missing = validateInboxTemplateSending(
    props.template.components,
    parameterData,
    dbTemplate?.defaultValues,
  )?.includes(false);
  const header = props.template.components.find((c) => c.type === "HEADER");
  const needsInput = props.template.components.some(
    (c) =>
      (c.type === "HEADER" && c.format && c.format !== "TEXT") ||
      (c.type === "BODY" && c.example?.body_text?.[0]?.length),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 sm:hidden"
          aria-label={translations("Back to templates")}
          onClick={props.onBack}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {props.template.name}
        </h3>
        <Badge variant="outline" className="shrink-0">
          {props.template.language}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className={
            needsInput
              ? "grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              : "p-4 sm:p-5"
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{translations("Preview")}</p>
            {/* The customer's side of the chat, so the bubble reads as it will arrive. */}
            <div className="rounded-xl bg-muted/60 p-3 sm:p-4">
              <WaInboxSingleMessageLayout
                forPreview
                exchangeProcess="send"
                messageObject={{} as WaGetMessagesBody}
              >
                <WaInboxTemplate parameters={parameterData} templateBody={props.template} />
              </WaInboxSingleMessageLayout>
            </div>
          </div>
          {needsInput ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {translations("Fill in the details")}
              </p>
              <WaTemplateFormElements
                setParameterData={setParameterData}
                template={props.template}
                hideEmpty
              />
            </div>
          ) : (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              {translations("Nothing to fill in. This template is sent exactly as shown.")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {missing
            ? translations("Add the {kind} header to send.", {
                kind: translations((header?.format ?? "media").toLowerCase()),
              })
            : translations("Ready to send.")}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={props.onClose}>
            {translations("Cancel")}
          </Button>
          <Button
            onClick={handleSendTemplate}
            disabled={missing}
            loading={loading}
            className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
          >
            <IconSend className="size-4" />
            {translations("Send template")}
          </Button>
        </div>
      </div>
    </div>
  );
}
