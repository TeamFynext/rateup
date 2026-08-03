import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceSdCard } from "@tabler/icons-react";
import { useId, useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { TextareaWithLengthTracker } from "@/components/input/TextareaWithLengthTracker.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { WaFlowFormElementType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getWaFlowFormElementTypeLabel } from "@/utils/enums/index.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import {
  getFlowFormElementById,
  getFlowTextLimit,
  getFormObjFromScreenId,
} from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";

/** The embedded-link element's editable properties, plus the screen it navigates to. */
interface EmbeddedLinkFormValues {
  text: string;
  type: WaFlowFormElementType;
  embeddedLinkScreenId: string;
}

export function FlowEmbeddedLinkDetailedView() {
  const uid = useId();
  const { selectedFormElementId, flowJson, updateFlowJson, selectedScreenId } =
    useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(selectedFormElementId, flowJson);
  const [nonInputTextType] = useState(
    selectedFormElement?.type === WaFlowFormElementType.nonInputText
      ? WaFlowFormElementType.textHeading
      : selectedFormElement?.type,
  );
  const { t: translations } = useTranslation();
  const limit = getFlowTextLimit(selectedFormElement?.type);

  const schema = z.object({
    text: z
      .string()
      .trim()
      .min(1, "Text is required")
      .max(limit, `Text should be less than ${limit} characters`),
    type: z.custom<WaFlowFormElementType>(),
    embeddedLinkScreenId: z.string(),
  });

  const form = useForm<EmbeddedLinkFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: selectedFormElement?.text || "",
      type: nonInputTextType,
      embeddedLinkScreenId: "",
    },
  });

  const onSave = form.handleSubmit(
    (values) => {
      const flowForm = getFormObjFromScreenId(flowJson.screens, selectedScreenId);
      const index = flowForm?.children.findIndex((fe) => fe === selectedFormElement) ?? -1;
      updateFlowJson((draft) => {
        const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
        const footer = formEl?.children?.find((data) => data.type === WaFlowFormElementType.footer);

        formEl!.children[index]!.text = values.text;
        formEl!.children[index]!["on-click-action"] = {
          name: "navigate",
          next: {
            type: "screen",
            name: values.embeddedLinkScreenId,
          },
          payload: footer?.["on-click-action"]?.payload ?? {
            test_payload: "This is a test_payload",
          },
        };
      });
    },
    () => {
      toast.error(translations("Fix errors before saving"));
    },
  );

  const currentIndex = flowJson.screens.findIndex((s) => s.id === selectedScreenId);
  const nextScreens = flowJson.screens.slice(currentIndex + 1);

  return (
    <div className="relative flex h-full flex-col justify-between">
      <ScrollArea className="h-4/5">
        <div className="flex justify-between">
          <Badge variant="outline" className="text-muted-foreground">
            {getWaFlowFormElementTypeLabel(selectedFormElement?.type)}
          </Badge>
        </div>
        <div className="flex gap-0.5 p-0.5 pr-10">
          <div className="flex flex-1 flex-col gap-3 overflow-x-clip overflow-y-auto p-3">
            <Controller
              name="text"
              control={form.control}
              render={({ field, fieldState }) => (
                <div className="mb-5 flex flex-col gap-1">
                  <TextareaWithLengthTracker
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => void onSave()]])}
                    maxValue={getFlowTextLimit(nonInputTextType)}
                    placeholder={translations("Enter your text here *")}
                    aria-invalid={fieldState.invalid}
                    textareaClassName="text-2xl font-extrabold"
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-500">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            <Controller
              name="embeddedLinkScreenId"
              control={form.control}
              render={({ field }) => (
                <Field className="w-75">
                  <FieldLabel htmlFor={`${uid}-next-screen`}>Next screen</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={nextScreens?.map((data) => ({
                      label: data?.title,
                      value: data?.id,
                    }))}
                  >
                    <SelectTrigger id={`${uid}-next-screen`} className="w-full">
                      <SelectValue placeholder={translations("select next screen")} />
                    </SelectTrigger>
                    <SelectContent>
                      {nextScreens?.map((data) => (
                        <SelectItem key={data?.id} value={data?.id}>
                          {data?.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
        </div>
      </ScrollArea>
      <div className="flex flex-col gap-3">
        <Separator />
        <div className="flex items-center justify-between p-2 px-3">
          <Button size="lg" onClick={onSave}>
            <IconDeviceSdCard />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
