import { IconDeviceSdCard } from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { TextareaWithLengthTracker } from "@/components/input/TextareaWithLengthTracker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { WaFlowFormElementType, WhatsappFlowFontWeight } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";
import {
  getFlowFormElementById,
  getFlowTextLimit,
  getFormObjFromScreenId,
} from "@/utils/whatsapp/flow.utils";

import { EditFlowContext } from "./EditFlowContext.ts";

export function FlowTextDetailedView() {
  const { selectedFormElementId, flowJson, updateFlowJson, selectedScreenId } =
    useContext(EditFlowContext);
  const selectedFormElement = getFlowFormElementById(selectedFormElementId, flowJson);
  const [nonInputTextType, setNonInputTextType] = useState(
    selectedFormElement.type === WaFlowFormElementType.nonInputText
      ? WaFlowFormElementType.textHeading
      : selectedFormElement.type,
  );
  const { t: translations } = useTranslation();

  const form = useForm<any>({
    defaultValues: {
      text: selectedFormElement.text || "",
      type: nonInputTextType,
      fontWeight: selectedFormElement["font-weight"] || "normal",
      strikethrough: selectedFormElement.strikethrough || false,
    },
  });

  const textValue = form.watch("text");
  const fontWeight = form.watch("fontWeight");
  const strikethrough = form.watch("strikethrough");

  const textDecoration = [
    WaFlowFormElementType.textBody,
    WaFlowFormElementType.textCaption,
  ].includes(nonInputTextType);

  const validateText = (text: string): string | null => {
    const limit = getFlowTextLimit(nonInputTextType);
    if (!text) return "Text is required";
    if (text.length > limit) return `Text should be less than ${limit} characters`;
    return null;
  };

  function handleSaveElement() {
    const values = form.getValues();
    const err = validateText(values.text);
    if (err) {
      form.setError("text", { message: err });
      toast.error(translations("Fix errors before saving"));
      return "error";
    }
    form.clearErrors("text");
    const flowForm = getFormObjFromScreenId(flowJson.screens, selectedScreenId);
    const index = flowForm.children.findIndex((fe) => fe === selectedFormElement);
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, selectedScreenId);
      formEl.children[index].text = values.text;
      if (textDecoration) {
        formEl.children[index]["font-weight"] = values.fontWeight;
        formEl.children[index].strikethrough = values.strikethrough;
      } else {
        delete formEl.children[index]["font-weight"];
        delete formEl.children[index].strikethrough;
      }
      formEl.children[index].type = nonInputTextType;
    });
  }

  useEffect(() => {
    if (!validateText(textValue)) handleSaveElement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textValue, fontWeight, strikethrough]);

  const fontStyle: React.CSSProperties = {
    fontSize: textFontSize[nonInputTextType],
    fontWeight: textDecoration ? "inherit" : 800,
    ...getTextStyle(fontWeight, textDecoration),
    textDecoration: textDecoration && strikethrough ? "line-through" : "none",
  };

  return (
    <div className="relative flex h-full flex-col justify-between">
      <ScrollArea className="h-4/5">
        <div className="flex justify-between">
          <Select
            value={nonInputTextType}
            onValueChange={(v) => setNonInputTextType(v as any)}
            items={TEXT_TYPE_OPTIONS(translations)}
          >
            <SelectTrigger>
              <SelectValue placeholder={translations("Select text type")} />
            </SelectTrigger>
            <SelectContent>
              {TEXT_TYPE_OPTIONS(translations).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-0.5 p-0.5 pr-10">
          <div className="flex flex-1 flex-col gap-2 overflow-x-clip overflow-y-auto p-3">
            <div className={textDecoration ? "flex flex-wrap items-center gap-3" : "hidden"}>
              <Controller
                name="fontWeight"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="mt-1 flex flex-row flex-wrap gap-3"
                  >
                    {[
                      { value: WhatsappFlowFontWeight.bold, label: translations("Bold") },
                      { value: WhatsappFlowFontWeight.italic, label: translations("Italics") },
                      {
                        value: WhatsappFlowFontWeight.boldAndItalic,
                        label: translations("Bold and italic"),
                      },
                      { value: WhatsappFlowFontWeight.normal, label: translations("Normal") },
                    ].map((opt) => (
                      <Label key={opt.value} className="flex items-center gap-1.5 text-xs">
                        <RadioGroupItem value={opt.value} />
                        {opt.label}
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
              <Controller
                name="strikethrough"
                control={form.control}
                render={({ field }) => (
                  <Label className="mt-1 flex items-center gap-1.5 text-xs">
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} size="sm" />
                    {translations("Strike Through")}
                  </Label>
                )}
              />
            </div>
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
                    onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSaveElement]])}
                    maxValue={getFlowTextLimit(nonInputTextType)}
                    placeholder={translations("Enter your text here *")}
                    aria-invalid={fieldState.invalid}
                    style={fontStyle}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-500">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </ScrollArea>
      <div className="flex flex-col gap-3">
        <Separator />
        <div className="flex items-center justify-end p-2 px-3">
          <Button size="lg" onClick={handleSaveElement}>
            <IconDeviceSdCard />
            {translations("Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const TEXT_TYPE_OPTIONS = (translations: (k: string) => string) => [
  { value: WaFlowFormElementType.textHeading, label: translations("Large Heading") },
  { value: WaFlowFormElementType.textSubHeading, label: translations("Sub Heading") },
  { value: WaFlowFormElementType.textBody, label: translations("Body") },
  { value: WaFlowFormElementType.textCaption, label: translations("Caption") },
];

export const getTextStyle = (style: string, type: boolean): React.CSSProperties => {
  let response: React.CSSProperties = {};
  if (!type) return response;
  switch (style) {
    case WhatsappFlowFontWeight.bold:
      response = { fontWeight: "bold" };
      break;
    case WhatsappFlowFontWeight.italic:
      response = { fontStyle: "italic" };
      break;
    case WhatsappFlowFontWeight.boldAndItalic:
      response = { fontWeight: "bold", fontStyle: "italic" };
      break;
    default:
      break;
  }
  return response;
};

const textFontSize = {
  [WaFlowFormElementType.textHeading]: "22px",
  [WaFlowFormElementType.textSubHeading]: "20px",
  [WaFlowFormElementType.textBody]: "18px",
  [WaFlowFormElementType.textCaption]: "16px",
};
