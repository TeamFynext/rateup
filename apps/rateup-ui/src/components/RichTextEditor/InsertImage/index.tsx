import { zodResolver } from "@hookform/resolvers/zod";
import { IconPhoto } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

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

const ENTER_URL = "Enter Image Url";
const UPLOAD_IMAGE = "Upload Image";

const IMAGE_SOURCES = [
  { value: ENTER_URL, label: ENTER_URL },
  { value: UPLOAD_IMAGE, label: UPLOAD_IMAGE },
];

interface ImageFormValues {
  chooseImageDDState: string;
  imageUrlTextInput: string;
  uploadImageFileInputValue: File | null;
  imgWidth: number;
  imgHeight: number;
}

function InsertImage({ editor }: { editor: Editor | null }) {
  const { t: translations } = useTranslation();
  const [isPopoveOpen, setIsPopoverOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const imageSchema = useMemo(
    () =>
      z
        .object({
          chooseImageDDState: z.string(),
          imageUrlTextInput: z.string(),
          // `custom` rather than `instanceof(File)`: File is not available during SSR.
          uploadImageFileInputValue: z.custom<File | null>(),
          imgWidth: z.number().min(1, translations("Please enter image width")),
          imgHeight: z.number().min(1, translations("Please enter image height")),
        })
        .superRefine((values, ctx) => {
          // Compared against the option constants, not their translations — the stored
          // value is always the English key.
          if (values.chooseImageDDState === ENTER_URL) {
            try {
              new URL(values.imageUrlTextInput);
            } catch {
              ctx.addIssue({
                code: "custom",
                path: ["imageUrlTextInput"],
                message: translations("Please enter a valid URL"),
              });
            }
            return;
          }
          if (!values.uploadImageFileInputValue) {
            ctx.addIssue({
              code: "custom",
              path: ["uploadImageFileInputValue"],
              message: translations("Please Choose an image to upload"),
            });
          }
        }),
    [translations],
  );

  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      chooseImageDDState: ENTER_URL,
      imageUrlTextInput: "",
      uploadImageFileInputValue: null,
      imgWidth: 300,
      imgHeight: 300,
    },
  });

  const chooseImageDDState = form.watch("chooseImageDDState");

  const handlePopoverDDFormSubmit = useCallback(
    async (values: ImageFormValues) => {
      const {
        chooseImageDDState,
        imgWidth,
        imgHeight,
        imageUrlTextInput,
        uploadImageFileInputValue,
      } = values;
      if (chooseImageDDState === ENTER_URL) {
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
      } else if (chooseImageDDState === UPLOAD_IMAGE) {
        setIsUploadingFile(true);
        const { url } = await uploadFile("src", uploadImageFileInputValue!);
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({
              src: url ?? "",
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
    if (chooseImageDDState === ENTER_URL) {
      form.setValue("uploadImageFileInputValue", null);
    } else {
      form.setValue("imageUrlTextInput", "");
    }
  }, [chooseImageDDState, form]);

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
          onSubmit={form.handleSubmit(handlePopoverDDFormSubmit)}
          onReset={() => form.reset()}
        >
          <Controller
            name="chooseImageDDState"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  {translations("Choose Image:")}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <Select items={IMAGE_SOURCES} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name} className="w-full">
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
            )}
          />

          {chooseImageDDState === ENTER_URL ? (
            <Controller
              name="imageUrlTextInput"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {translations("Enter Image Url")}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder={translations("Enter the url of image")}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : (
            <Controller
              name="uploadImageFileInputValue"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {translations("Upload Image")}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    id={field.name}
                    type="file"
                    accept="image/*"
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          <div className="flex flex-nowrap items-start gap-3">
            <Controller
              name="imgWidth"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {translations("Width")}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={300}
                    placeholder={translations("width")}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="imgHeight"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {translations("Height")}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={300}
                    placeholder={translations("height")}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
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
