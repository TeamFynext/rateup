import { IconPhoto } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { uploadFile } from "@/components/Linktree/LinktreeEditor/ThemeEditor/components/SaveChangesBtn/uploadFile.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useBridgedForm } from "@/hooks/useBridgedForm";

const IMAGE_SOURCES = [
  { value: "Enter Image Url", label: "Enter Image Url" },
  { value: "Upload Image", label: "Upload Image" },
];

function InsertImage({ editor }: { editor: Editor | null }) {
  const { t: translations } = useTranslation();
  const [isPopoveOpen, setIsPopoverOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const form = useBridgedForm({
    defaultValues: {
      chooseImageDDState: "Enter Image Url",
      imageUrlTextInput: "",
      uploadImageFileInputValue: null,
      imgWidth: 300,
      imgHeight: 300,
    },
    validate: {
      imageUrlTextInput: (value, values) => {
        const chooseImageDDState = values.chooseImageDDState;
        if (chooseImageDDState === translations("Enter Image Url")) {
          try {
            new URL(value);
          } catch {
            return translations("Please enter a valid URL");
          }
        } else {
          return null;
        }
      },
      uploadImageFileInputValue: (value, values) => {
        const chooseImageDDState = values.chooseImageDDState;
        if (chooseImageDDState === "Upload Image") {
          if (!value) return translations("Please Choose an image to upload");
        } else {
          return null;
        }
      },
      imgWidth: (value) => {
        if (!value) {
          return translations("Please enter image width");
        } else {
          return null;
        }
      },
      imgHeight: (value) => {
        if (!value) {
          return translations("Please enter image height");
        } else {
          return null;
        }
      },
    },
  });

  const chooseImageDDState = form.getValues().chooseImageDDState;

  const handlePopoverDDFormSubmit = useCallback(
    async (values) => {
      const {
        chooseImageDDState,
        imgWidth,
        imgHeight,
        imageUrlTextInput,
        uploadImageFileInputValue,
      } = values;
      if (chooseImageDDState === "Enter Image Url") {
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: imageUrlTextInput,
              style: `width: ${imgWidth}px; height: ${imgHeight}px; max-width: 100%; object-fit:contain`,
            })
            .run();
          setIsPopoverOpen(false);
        }
      } else if (chooseImageDDState === "Upload Image") {
        setIsUploadingFile(true);
        const { url } = await uploadFile("src", uploadImageFileInputValue);
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: url,
              style: `
  width: ${imgWidth}px;
  height: ${imgHeight}px;
  object-fit: contain;
  max-width: 100%;
`,
            })
            .run();
          setIsUploadingFile(false);
          setIsPopoverOpen(false);
        }
      }
    },
    [editor],
  );

  useEffect(() => {
    if (chooseImageDDState === "Enter Image Url") {
      form.setFieldValue("uploadImageFileInputValue", null);
    } else {
      form.setFieldValue("imageUrlTextInput", "");
    }
  }, [chooseImageDDState]);

  return (
    <Popover
      open={isPopoveOpen}
      onOpenChange={(next) => {
        // The upload is in flight — don't let a stray click tear the form down.
        if (isUploadingFile) return;
        if (!next) form.reset();
        setIsPopoverOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Insert image"
            title={translations("Insert image")}
            className="h-8 w-8 p-0 sm:h-9 sm:w-9"
          />
        }
      >
        <IconPhoto size={16} />
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl p-4">
        <form
          className="flex w-75 flex-col gap-4 [&_label]:mb-1"
          onSubmit={form.onSubmit(handlePopoverDDFormSubmit)}
          onReset={form.onReset}
        >
          <Field>
            <FieldLabel>
              {translations("Choose Image:")}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              items={IMAGE_SOURCES}
              value={form.getValues().chooseImageDDState}
              onValueChange={(next) => form.setFieldValue("chooseImageDDState", next as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {form.getValues().chooseImageDDState === "Enter Image Url" ? (
            <Field>
              <FieldLabel>
                {translations("Enter Image Url")}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                placeholder={translations("Enter the url of image")}
                aria-invalid={!!form.errors.imageUrlTextInput}
                value={form.getValues().imageUrlTextInput}
                onChange={(e) => form.setFieldValue("imageUrlTextInput", e.target.value)}
              />
              {form.errors.imageUrlTextInput && (
                <FieldError>{form.errors.imageUrlTextInput}</FieldError>
              )}
            </Field>
          ) : (
            <Field>
              <FieldLabel>
                {translations("Upload Image")}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                type="file"
                accept="image/*"
                aria-invalid={!!form.errors.uploadImageFileInputValue}
                onChange={(e) =>
                  form.setFieldValue("uploadImageFileInputValue", e.target.files?.[0] ?? null)
                }
              />
              {form.errors.uploadImageFileInputValue && (
                <FieldError>{form.errors.uploadImageFileInputValue}</FieldError>
              )}
            </Field>
          )}

          <div className="flex flex-nowrap items-start gap-3">
            <Field>
              <FieldLabel>
                {translations("Width")}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                type="number"
                min={300}
                placeholder={translations("width")}
                value={form.getValues().imgWidth}
                onChange={(e) => form.setFieldValue("imgWidth", Number(e.target.value))}
              />
            </Field>

            <Field>
              <FieldLabel>
                {translations("Height")}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                type="number"
                min={300}
                placeholder={translations("height")}
                value={form.getValues().imgHeight}
                onChange={(e) => form.setFieldValue("imgHeight", Number(e.target.value))}
              />
            </Field>
          </div>

          <Button type="submit" disabled={isUploadingFile}>
            {isUploadingFile && <Spinner />}
            {translations("submit")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default InsertImage;
