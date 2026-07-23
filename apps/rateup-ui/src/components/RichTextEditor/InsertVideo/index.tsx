import { IconVideo } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useBridgedForm } from "@/hooks/useBridgedForm";

import { isYouTubeLink } from "../utils.ts";

function InsertVideo({ editor }: { editor: Editor | null }) {
  const form = useBridgedForm({
    defaultValues: {
      src: "",
      height: 0,
      width: 0,
      customSize: false,
    },
  });
  const [opened, setOpened] = useState(false);
  const { t: translations } = useTranslation();
  const handleImageVideo = () => {
    try {
      const url = form.getValues().src;
      new URL(url);
      const videoOption = form.getValues().customSize
        ? {
            src: url,
            width: form.getValues().width,
            height: form.getValues().height,
          }
        : { src: form.getValues().src };
      if (isYouTubeLink(url)) {
        editor?.commands.setYoutubeVideo(videoOption);
      } else {
        editor?.commands.setVideo(videoOption);
      }
      setOpened(false);
      form.reset();
    } catch {
      form.setErrors({ src: "Enter a valid url" });
    }
  };
  return (
    <Popover open={opened} onOpenChange={setOpened}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Insert video"
            title={translations("Insert video")}
            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
          />
        }
      >
        <IconVideo size={16} />
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <div className="flex flex-col justify-center gap-3">
          <div className="flex items-end gap-3">
            <Tooltip>
              <TooltipTrigger render={<div className="mb-2.5 w-fit" />}>
                <Switch
                  checked={form.getValues().customSize}
                  onCheckedChange={(next) => form.setFieldValue("customSize", next)}
                />
              </TooltipTrigger>
              <TooltipContent>{translations("Enable Custom size")}</TooltipContent>
            </Tooltip>
            <Field className="w-25">
              <FieldLabel>{translations("height")}</FieldLabel>
              <Input
                type="number"
                min={0}
                disabled={!form.getValues().customSize}
                value={form.getValues().height}
                onChange={(e) => form.setFieldValue("height", Number(e.target.value))}
              />
            </Field>
            <Field className="w-25">
              <FieldLabel>{translations("width")}</FieldLabel>
              <Input
                type="number"
                min={0}
                disabled={!form.getValues().customSize}
                value={form.getValues().width}
                onChange={(e) => form.setFieldValue("width", Number(e.target.value))}
              />
            </Field>
          </div>

          <Field>
            <Input
              type="url"
              placeholder={translations("Enter the url of video")}
              aria-invalid={!!form.errors.src}
              value={form.getValues().src}
              onChange={(e) => form.setFieldValue("src", e.target.value)}
            />
            {form.errors.src && <FieldError>{form.errors.src}</FieldError>}
          </Field>
          <Button onClick={handleImageVideo}>{translations("submit")}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default InsertVideo;
