import { IconVideo } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import { isYouTubeLink } from "../utils.ts";

interface VideoFormValues {
  src: string;
  height: number;
  width: number;
  customSize: boolean;
}

function InsertVideo({ editor }: { editor: Editor | null }) {
  const form = useForm<VideoFormValues>({
    defaultValues: {
      src: "",
      height: 0,
      width: 0,
      customSize: false,
    },
  });
  const [opened, setOpened] = useState(false);
  const { t: translations } = useTranslation();
  const customSize = form.watch("customSize");

  const handleImageVideo = () => {
    const { src, width, height, customSize } = form.getValues();
    try {
      new URL(src);
    } catch {
      form.setError("src", { type: "validate", message: "Enter a valid url" });
      return;
    }
    const videoOption = customSize ? { src, width, height } : { src };
    if (isYouTubeLink(src)) {
      editor?.commands.setYoutubeVideo(videoOption);
    } else {
      editor?.commands.setVideo(videoOption);
    }
    setOpened(false);
    form.reset();
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
            <Controller
              name="customSize"
              control={form.control}
              render={({ field }) => (
                <Tooltip>
                  <TooltipTrigger render={<div className="mb-2.5 w-fit" />}>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </TooltipTrigger>
                  <TooltipContent>{translations("Enable Custom size")}</TooltipContent>
                </Tooltip>
              )}
            />
            <Controller
              name="height"
              control={form.control}
              render={({ field }) => (
                <Field className="w-25">
                  <FieldLabel htmlFor={field.name}>{translations("height")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    disabled={!customSize}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </Field>
              )}
            />
            <Controller
              name="width"
              control={form.control}
              render={({ field }) => (
                <Field className="w-25">
                  <FieldLabel htmlFor={field.name}>{translations("width")}</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    disabled={!customSize}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </Field>
              )}
            />
          </div>

          <Controller
            name="src"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  id={field.name}
                  type="url"
                  placeholder={translations("Enter the url of video")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button onClick={handleImageVideo}>{translations("submit")}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default InsertVideo;
