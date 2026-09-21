// Extracted verbatim from `ChoicesCreator.tsx`. Behaviour is unchanged.

import { IconEdit, IconTrash, IconUpload } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useResponses } from "@/backend/surveys/response/response.query";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { ImageCropModal } from "@/components/Modal/ImageCropModal.tsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/context/confirm-provider.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { NPSWeightage, QuestionType, SurveyType } from "@/types/enums.ts";
import {
  DEFAULT_IMAGE_BASE64_START,
  MAX_DESCRIPTION_COUNT,
  MAX_FILE_SIZE_IN_BYTE,
  MAX_FILE_SIZE_IN_MB,
  MAX_METADATA_COUNT,
} from "@/utils/constants.ts";
import { uploadFile } from "@/utils/file-upload/upload.ts";

import { getNpsColor } from "../../QuestionDetailedView.tsx";
import { FileConverter } from "../ChoicesCreator.tsx";
import type { ChoiceFormValues } from "../ChoicesCreator.tsx";
import type { ChoiceProps } from "./shared.tsx";

export function Choice({
  choice,
  onDelete,
  form,
  index,
  image,
  buttonRef,
  maxCharCount,
  surveyType,
}: ChoiceProps) {
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const confirm = useConfirm();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>();
  const [selectedInputImage, setSelectedInputImage] = useState({ url: "", name: "" });
  const [fileError, setFileError] = useState("");
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [isSubmited, setIsSubmited] = useState(false);
  const [openedCropDialog, setOpenedCropDialog] = useState(false);
  const { surveyTeamMapId } = useContext(SurveyContext);
  const { data: responses } = useResponses(surveyTeamMapId);
  const imagePickerRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newWeightage = choice?.weightage;
  const { t: translations } = useTranslation();

  const choices = form.values?.choices?.[selectedLanguage];

  const choiceSchema = z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(surveyType !== SurveyType.Web ? 30 : 100)
      .refine((title) => {
        const isDuplicate = choices?.some((c: Choice, i: number) => {
          // Picture choices nest the text under `value.value`, WhatsApp choices
          // under `value.title`, and web choices store a plain string.
          const choiceValue = image
            ? (c?.value as { value?: string })?.value?.replace(/\s+/g, "")
            : surveyType !== SurveyType.Web
              ? (c?.value as { title?: string })?.title?.replace(/\s+/g, "")
              : (c?.value as string)?.replace(/\s+/g, "");
          return i !== index && choiceValue === title.replace(/\s+/g, "");
        });
        return !isDuplicate;
      }, "Option already exists"),
    description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
    metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
    image: z.string().optional().nullable(),
  });

  const {
    register,
    getValues,
    setValue: setFormValue,
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

  useEffect(() => {
    if (typeof choice.value === "object") {
      setFormValue("title", choice.value?.title ?? "");
      setFormValue("description", choice.value?.description ?? "");
      setFormValue("metadata", choice.value?.metadata ?? "");
      setFormValue("image", choice.value?.image ?? "");
    } else {
      setFormValue("title", choice.value ?? "");
    }
  }, []);

  const handleEditWarningConfirm = async () => {
    const shouldEdit = await confirm({
      title: translations("Warning"),
      description: translations(
        "Editing the choice may affect previous result count.Do you still want to continue?",
      ),
      confirmText: translations("Yes"),
    });
    if (!shouldEdit) return;
    setOpenedEditModal(true);
  };

  const onChangePicture = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_IN_BYTE) {
      toast.error(`Max file size is ${MAX_FILE_SIZE_IN_MB} MB`);
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
    setOpenedEditModal(true);
  };

  const handleChangeWeightage = (value: NPSWeightage | null) => {
    const updatedChoices = form.values?.choices?.[selectedLanguage]?.map((c: Choice) => {
      if (c.value === choice?.value) return { ...c, weightage: value };
      return c;
    });
    form.setFieldValue?.("choices", {
      ...form.values?.choices,
      [selectedLanguage]: updatedChoices,
    });
  };

  const handleEditChoice = async () => {
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

    if (image) {
      let fileKey = "";
      if (selectedImageFile) {
        setFileUploadLoading(true);
        fileKey = await uploadFile(selectedImageFile);
        setFileUploadLoading(false);
      }
      const updatedChoices = choices?.map((c: Choice, i: number) => {
        if (i === index)
          return {
            ...c,
            value: {
              value: values.title,
              image: fileKey ? fileKey : (c?.value as { image?: string })?.image,
            },
          };
        return c;
      });
      form.setFieldValue?.("choices", {
        ...form.values?.choices,
        [selectedLanguage]: updatedChoices,
      });
      setSelectedImageFile(null);
    } else {
      const choiceObj = {
        value:
          surveyType !== SurveyType.Web
            ? Object.fromEntries(
                Object.entries(values).filter(([_key, val]) => (val as string)?.trim() !== ""),
              )
            : values.title,
      };
      const updatedChoices = form.values?.choices?.[selectedLanguage]?.map(
        (c: Choice, i: number) => {
          if (i === index) return { ...c, ...choiceObj };
          return c;
        },
      );
      form.setFieldValue?.("choices", {
        ...form.values?.choices,
        [selectedLanguage]: updatedChoices,
      });
    }
    setIsSubmited(true);
    setOpenedEditModal(false);
  };

  const clearFile = () => {
    setFormValue("image", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (file: File) => {
    try {
      if (!file) return;
      if (file.size > 300000) {
        setError("image", { message: "max image size is 300KB" });
        return;
      }
      clearErrors("image");
      const base64String = await FileConverter.fileToBase64(file);
      setFormValue("image", base64String);
    } catch (error) {
      console.error("Image read failed", error);
      toast.error(translations("Could not read that image."), {
        id: "file-converting",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ImageCropModal
        opened={openedCropDialog}
        onclose={() => setOpenedCropDialog(false)}
        imageName={selectedInputImage.name}
        handleCropImageSave={handleCropImageSave}
        image={selectedInputImage.url}
        aspect={4 / 3}
      />

      {form.values?.type === QuestionType.CustomNPS ? (
        <div className="flex w-[85%] items-center gap-2">
          <span
            className="mt-[5px] size-2 shrink-0 rounded-full"
            style={{ backgroundColor: getNpsColor(choice.weightage) }}
          />
          <span className="flex-1 text-sm">{typeof choice.value !== "object" && choice.value}</span>
          <Select value={newWeightage} onValueChange={handleChangeWeightage}>
            <SelectTrigger
              className="w-[140px]"
              style={{ outline: `1px solid ${getNpsColor(newWeightage)}` }}
            >
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
        </div>
      ) : typeof choice.value === "object" ? (
        <div className="flex flex-1 shrink items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background" />
          {choice.value?.image ? (
            <img
              src={`${DEFAULT_IMAGE_BASE64_START}${choice.value?.image}`}
              className="size-[30px] object-cover"
              alt=""
            />
          ) : (
            <div className="size-[30px]" />
          )}
          <div className="flex-1">
            <p className="text-sm">
              {translations("Title: ")}
              {choice.value?.title}
            </p>
            {choice.value?.description && (
              <p className="text-sm">
                {translations("Description: ")}
                {choice.value?.description}
              </p>
            )}
            {choice.value?.metadata && (
              <p className="text-sm">
                {translations("Metadata: ")}
                {choice.value?.metadata}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 shrink items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background" />
          <span className="text-sm">{choice?.value}</span>
        </div>
      )}

      <Button
        aria-label={translations("Edit")}
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={responses?.length ? handleEditWarningConfirm : () => setOpenedEditModal(true)}
      >
        <IconEdit className="size-4" />
      </Button>
      <Button
        aria-label={translations("Delete")}
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-destructive"
        onClick={onDelete}
      >
        <IconTrash className="size-4" />
      </Button>

      <Dialog open={openedEditModal} onOpenChange={(open) => !open && setOpenedEditModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Edit Choice")}</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor={`edit-title-${index}`}>{translations("Title")} *</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id={`edit-title-${index}`}
                  placeholder={translations("Enter title here")}
                  aria-invalid={!!errors.title}
                  {...register("title")}
                />
                {maxCharCount && (
                  <LengthTracker length={watchTitle?.length} maxValue={maxCharCount} />
                )}
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
                  <FieldLabel htmlFor={`edit-desc-${index}`}>
                    {translations("Description")}
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`edit-desc-${index}`}
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

                <Field data-invalid={!!errors.metadata}>
                  <FieldLabel htmlFor={`edit-meta-${index}`}>{translations("Metadata")}</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`edit-meta-${index}`}
                      placeholder={translations("Enter metadata here")}
                      aria-invalid={!!errors.metadata}
                      {...register("metadata")}
                    />
                    {MAX_METADATA_COUNT && (
                      <LengthTracker length={watchMetadata?.length} maxValue={MAX_METADATA_COUNT} />
                    )}
                  </div>
                  {errors.metadata && (
                    <FieldDescription className="text-destructive">
                      {errors.metadata.message}
                    </FieldDescription>
                  )}
                </Field>

                <Field data-invalid={!!errors.image}>
                  <FieldTitle>{translations("Image")}</FieldTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconUpload data-icon="inline-start" />
                      {watchImage ? translations("Change Image") : translations("Upload Image")}
                    </Button>
                    {watchImage && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
                        {translations("Clear")}
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileChange(file);
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
              </>
            )}

            {image && (
              <Field data-invalid={!!fileError}>
                <FieldTitle>{translations("Choice Image")}</FieldTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imagePickerRef.current?.click()}
                  >
                    <IconUpload data-icon="inline-start" />
                    {selectedImageFile?.name ?? translations("Edit Image")}
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
                </div>
                {fileError && (
                  <FieldDescription className="text-destructive">
                    {translations("Image Is Required")}
                  </FieldDescription>
                )}
              </Field>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button onClick={handleEditChoice} loading={fileUploadLoading}>
              {translations("Update Choice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
