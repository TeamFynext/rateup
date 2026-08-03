import { IconPlus, IconUpload } from "@tabler/icons-react";
import { useId, useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useImageStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { ImageCropModal } from "@/components/Modal/ImageCropModal.tsx";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import type { PageType } from "@/types/enums.ts";
import { NPSWeightage, QuestionType, SurveyType } from "@/types/enums.ts";
import {
  MAX_DESCRIPTION_COUNT,
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  MAX_METADATA_COUNT,
} from "@/utils/constants.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";

import { Choice } from "./choices/Choice.tsx";
import type { QuestionExtraPropsForm, QuestionFormFeatures } from "./questionForm.ts";

export type ChoiceFormValues = {
  title: string;
  description: string;
  metadata: string;
  image: string | null;
};

interface ChoicesCreatorProps {
  form: QuestionExtraPropsForm;
  qId: string;
  maxChoiceCount?: number;
  maxCharCount?: number;
  image?: boolean;
  surveyType?: SurveyType;
}

export function ChoicesCreator({
  form,
  maxCharCount,
  maxChoiceCount,
  image = false,
  surveyType,
}: Readonly<ChoicesCreatorProps>) {
  const uid = useId();
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const [choiceWeightage, setChoiceWeightage] = useState<NPSWeightage>(NPSWeightage.PROMOTER);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>();
  const [selectedInputImage, setSelectedInputImage] = useState({ url: "", name: "" });
  const [fileError, setFileError] = useState("");
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
  const [openedCropDialog, setOpenedCropDialog] = useState(false);
  const imagePickerRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const metaFileInputRef = useRef<HTMLInputElement>(null);

  const { t: translations } = useTranslation();
  const choices = form.values?.choices?.[selectedLanguage] || [];
  const features: QuestionFormFeatures = form.values?.features?.[selectedLanguage] || {
    other: {
      isEnabled: false,
      title: translations("Other"),
      placeholder: translations("Please enter your Other input"),
    },
  };

  const { updateImageArray } = useImageStore();

  const choiceSchema = z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(surveyType !== SurveyType.Web ? 30 : 100)
      .refine((title) => {
        const isDuplicate = choices.some((c: Choice) => {
          // Picture choices nest the text under `value.value`, WhatsApp choices
          // under `value.title`, and web choices store a plain string.
          const choiceValue = image
            ? (c?.value as { value?: string })?.value?.replace(/\s+/g, "")
            : surveyType !== SurveyType.Web
              ? (c?.value as { title?: string })?.title?.replace(/\s+/g, "")
              : (c?.value as string)?.replace(/\s+/g, "");
          return choiceValue === title.replace(/\s+/g, "");
        });
        return !isDuplicate;
      }, "Option already exists"),
    description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
    metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
    image: z.string().optional().nullable(),
  });

  const {
    register,
    reset: resetChoiceForm,
    getValues,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<ChoiceFormValues>({
    defaultValues: { title: "", description: "", metadata: "", image: "" },
  });

  const watchTitle = watch("title");
  const watchDescription = watch("description");
  const watchMetadata = watch("metadata");
  const watchImage = watch("image");

  useEffect(() => {
    if (form?.values?.choices && isSubmited) {
      buttonRef?.current?.click();
      setIsSubmited(false);
    }
  }, [isSubmited]);

  const handleAddChoice = async () => {
    clearErrors();
    const values = getValues();
    const result = choiceSchema.safeParse(values);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          setError(issue.path[0] as keyof ChoiceFormValues, { message: issue.message });
        }
      });
      return;
    }
    try {
      if (choiceWeightage.trim().length === 0) {
        setError("title", { message: "Text required" });
        return;
      }
      const choiceObj = {
        value:
          surveyType !== SurveyType.Web
            ? Object.fromEntries(
                Object.entries(values).filter(([_key, val]) => (val as string)?.trim() !== ""),
              )
            : values.title,
        weightage: form.values?.type === QuestionType.CustomNPS ? choiceWeightage : undefined,
      };
      if (image) {
        if (!selectedImageFile) {
          setFileError("select image");
          return;
        }
        setFileUploadLoading(true);
        const fileKey = await uploadFile(selectedImageFile);
        setFileUploadLoading(false);
        form.setFieldValue?.("choices", {
          ...form.values?.choices,
          [selectedLanguage]: [...choices, { value: { value: values.title, image: fileKey } }],
        });
        setSelectedImageFile(null);
        setIsSubmited(true);
      } else {
        form.setFieldValue?.("choices", {
          ...form.values?.choices,
          [selectedLanguage]: [...choices, choiceObj],
        });
      }
      resetChoiceForm();
      setChoiceWeightage(NPSWeightage.PROMOTER);
    } catch {
      resetChoiceForm();
      setFileUploadLoading(false);
    }
  };

  const handleRemoveChoice = (choice: Choice) => {
    if (image)
      updateImageArray({
        Key: typeof choice?.value === "object" ? choice.value.image : undefined,
      });
    form.setFieldValue?.("choices", {
      ...form.values?.choices,
      [selectedLanguage]: choices.filter((c: Choice) => c !== choice),
    });
  };

  const onChangePicture = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`${translations("Max file size is")} ${MAX_FILE_SIZE_IN_MB} MB`);
      return;
    }
    setSelectedInputImage({ url: URL.createObjectURL(file), name: file.name });
    setOpenedCropDialog(true);
    if (imagePickerRef.current) imagePickerRef.current.value = "";
  };

  const handleCropImageSave = (cropedImage: File | string) => {
    // Choice images are always cropped from a local blob, so the modal hands
    // back a File here; it only returns a string for Unsplash-sourced images.
    setSelectedImageFile(cropedImage as File);
    setFileError("");
  };

  const handleMetaFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000) {
        setError("image", { message: "max image size is 300KB" });
        return;
      }
      clearErrors("image");
      const base64String = await FileConverter.fileToBase64(file);
      setValue("image", base64String);
    } catch (error) {
      toast.error("Error converting file to Base64:" + JSON.stringify(error), {
        id: "file-converting",
      });
    }
  };

  const clearMetaFile = () => {
    setValue("image", null);
    if (metaFileInputRef.current) metaFileInputRef.current.value = "";
  };

  return (
    <>
      <ImageCropModal
        opened={openedCropDialog}
        onclose={() => setOpenedCropDialog(false)}
        imageName={selectedInputImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedInputImage.url}
        aspect={4 / 3}
      />

      <div
        className={cn(
          "flex flex-col py-2",
          form.values?.type === QuestionType.CustomNPS ? "gap-4" : "gap-2",
        )}
      >
        {choices.map((choice: Choice, i: number) => (
          <Choice
            key={i}
            choice={image && typeof choice?.value === "object" ? choice.value : choice}
            onDelete={() => handleRemoveChoice(choice)}
            form={form}
            index={i}
            image={image}
            buttonRef={buttonRef}
            maxCharCount={maxCharCount}
            surveyType={surveyType}
          />
        ))}
      </div>

      {(!maxChoiceCount || choices.length < maxChoiceCount) && (
        <div
          className="mt-2 flex flex-col gap-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddChoice();
            }
          }}
        >
          <div className="rounded-lg border bg-background p-3">
            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="add-choice-title">{translations("Title")} *</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="add-choice-title"
                    placeholder={translations("Enter title here")}
                    aria-invalid={!!errors.title}
                    {...register("title")}
                  />
                  {maxCharCount && (
                    <LengthTracker length={watchTitle?.length} maxValue={maxCharCount} />
                  )}
                  {form?.values?.type === QuestionType.CustomNPS && (
                    <Select
                      value={choiceWeightage}
                      onValueChange={(value) => setChoiceWeightage(value as NPSWeightage)}
                    >
                      <SelectTrigger className="w-[120px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(NPSWeightage).map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <button type="submit" className="hidden" ref={buttonRef} />
                  <Button
                    type="button"
                    variant={image ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={handleAddChoice}
                    disabled={fileUploadLoading}
                  >
                    {fileUploadLoading ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <IconPlus data-icon="inline-start" />
                    )}
                    {translations("Add choice")}
                  </Button>
                </div>
                {errors.title && (
                  <FieldDescription className="text-destructive">
                    {errors.title.message}
                  </FieldDescription>
                )}
              </Field>

              {surveyType !== SurveyType.Web && (
                <>
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="add-choice-desc">{translations("Description")}</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        id="add-choice-desc"
                        placeholder={translations("Enter description here")}
                        aria-invalid={!!errors.description}
                        {...register("description")}
                      />
                      {MAX_DESCRIPTION_COUNT && (
                        <LengthTracker
                          length={watchDescription?.length}
                          maxValue={MAX_DESCRIPTION_COUNT}
                        />
                      )}
                    </div>
                    {errors.description && (
                      <FieldDescription className="text-destructive">
                        {errors.description.message}
                      </FieldDescription>
                    )}
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field data-invalid={!!errors.metadata}>
                      <FieldLabel htmlFor="add-choice-meta">Metadata</FieldLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          id="add-choice-meta"
                          placeholder="Enter metadata here"
                          aria-invalid={!!errors.metadata}
                          {...register("metadata")}
                        />
                        {MAX_METADATA_COUNT && (
                          <LengthTracker
                            length={watchMetadata?.length}
                            maxValue={MAX_METADATA_COUNT}
                          />
                        )}
                      </div>
                      {errors.metadata && (
                        <FieldDescription className="text-destructive">
                          {errors.metadata.message}
                        </FieldDescription>
                      )}
                    </Field>

                    <Field className="mt-5" data-invalid={!!errors.image}>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => metaFileInputRef.current?.click()}
                        >
                          <IconUpload data-icon="inline-start" />
                          {watchImage ? translations("Change Image") : translations("Upload Image")}
                        </Button>
                        {watchImage && (
                          <Button type="button" variant="ghost" size="sm" onClick={clearMetaFile}>
                            {translations("Clear")}
                          </Button>
                        )}
                        <input
                          ref={metaFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMetaFileChange(file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                      {errors.image && (
                        <FieldDescription className="text-destructive">
                          {String(errors.image.message)}
                        </FieldDescription>
                      )}
                    </Field>
                  </div>
                </>
              )}
            </FieldGroup>
          </div>

          {image && (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => imagePickerRef.current?.click()}
              >
                <IconUpload data-icon="inline-start" />
                {selectedImageFile?.name ?? translations("Select Image")}
              </Button>
              <input
                ref={imagePickerRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onChangePicture(file);
                }}
              />
              {fileError && (
                <p className="text-sm text-destructive">{translations("Image Is Required")}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!!form.values?.type &&
        ([QuestionType.MCQ, QuestionType.MSQ] as Array<QuestionType | PageType>).includes(
          form.values.type,
        ) &&
        surveyType === SurveyType.Web && (
          <div className="mt-2 rounded-lg border bg-background">
            <Field orientation="horizontal" className="p-3">
              <FieldLabel htmlFor={`${uid}-field`}>{translations("Enable Other")}</FieldLabel>
              <Switch
                id={`${uid}-field`}
                checked={features?.other?.isEnabled}
                onCheckedChange={(checked) => {
                  form.setFieldValue?.("features", {
                    ...form.values?.features,
                    [selectedLanguage]: {
                      ...features,
                      other: { ...features.other, isEnabled: checked },
                    },
                  });
                }}
              />
            </Field>

            {features?.other?.isEnabled && (
              <FieldGroup className="border-t p-3">
                <Field>
                  <FieldLabel htmlFor={`${uid}-field-2`}>
                    {translations("Title for 'Other'")}
                  </FieldLabel>
                  <Textarea
                    id={`${uid}-field-2`}
                    className="bg-background"
                    value={features?.other?.title}
                    onChange={(e) => {
                      form.setFieldValue?.("features", {
                        ...form.values?.features,
                        [selectedLanguage]: {
                          ...features,
                          other: { ...features.other, title: e.currentTarget.value },
                        },
                      });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-field-3`}>
                    {translations("Placeholder text for other input")}
                  </FieldLabel>
                  <Textarea
                    id={`${uid}-field-3`}
                    className="bg-background"
                    value={features?.other?.placeholder}
                    onChange={(e) => {
                      form.setFieldValue?.("features", {
                        ...form.values?.features,
                        [selectedLanguage]: {
                          ...features,
                          other: { ...features.other, placeholder: e.currentTarget.value },
                        },
                      });
                    }}
                  />
                </Field>
              </FieldGroup>
            )}
          </div>
        )}
    </>
  );
}

export class FileConverter {
  public static async fileToBase64(file: File | string): Promise<string> {
    if (typeof file === "string") return file;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64URL = reader.result as string;
        const base64Data = base64URL.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
