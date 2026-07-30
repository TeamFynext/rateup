import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { FileUploadButton } from "@/components/ui/file-upload-button.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { QuestionType2 } from "@/types/enums.ts";
import {
  DEFAULT_IMAGE_BASE64_START,
  MAX_DESCRIPTION_COUNT,
  MAX_METADATA_COUNT,
  WaNPSQuestions2,
} from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { PopoverEmojiPicker } from "../../templates/Details/TextFormateToolBar.tsx";
import type { FlowChoice, FlowInputProps } from "./inputProps.ts";

const generateId = () => "_" + Math.random().toString(36).substr(2, 9);

/** RHF resolver that always validates against the latest schema held in `schemaRef`. */
function schemaRefResolver(schemaRef: React.MutableRefObject<z.ZodTypeAny>) {
  return (values: any) => {
    const result = schemaRef.current.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string;
      if (key && !errors[key]) errors[key] = { type: "validation", message: issue.message };
    }
    return { values: {}, errors };
  };
}

export function DataSourceInput(props: FlowInputProps<FlowChoice[]>) {
  const uid = useId();
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);
  const choices = props.value ?? [];
  const maxCharCount = props.maxCharCount ?? 30;
  const maxChoiceCount = props.maxChoice ?? 20;
  const { t: translations } = useTranslation();

  const choiceSchema = props?.onlyTitle
    ? z.object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .refine((title) => {
            const isDuplicate = choices.some((c: FlowChoice) => {
              const choiceValue = c?.title?.replace(/\s+/g, "");
              return choiceValue === title.replace(/\s+/g, "");
            });
            return !isDuplicate;
          }, "Option already exists"),
      })
    : z.object({
        title: z
          .string()
          .trim()
          .min(1)
          .max(30)
          .refine((title) => {
            const isDuplicate = choices.some((c) => {
              const choiceValue = c?.title?.replace(/\s+/g, "");
              return choiceValue === title.replace(/\s+/g, "");
            });
            return !isDuplicate;
          }, "Option already exists"),
        description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
        metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
        image: z.string().optional().nullable(),
      });
  const schemaRef = useRef<z.ZodTypeAny>(choiceSchema);
  schemaRef.current = choiceSchema;

  const form = useForm<any>({
    resolver: schemaRefResolver(schemaRef),
    defaultValues: props?.onlyTitle
      ? { title: "" }
      : { title: "", description: "", metadata: "", image: "" },
  });

  const handleAddChoice = async (values: any) => {
    try {
      const choiceObj = {
        id: generateId(),
        ...Object.fromEntries(
          Object.entries(values).filter(
            ([_key, value]) => typeof value === "string" && value.trim() !== "",
          ),
        ),
      };
      props.insertListItem("data-source", choiceObj);
      form.reset();
    } catch {
      form.reset();
      setFileUploadLoading(false);
    }
  };

  const handleRemoveChoice = (index: number) => {
    props.removeListItem("data-source", index);
  };

  const disabled =
    Object.values(WaNPSQuestions2).includes(props?.metaType as QuestionType2) || props.disabled;
  const submitAdd = form.handleSubmit(handleAddChoice);

  return (
    <Card className="gap-2 p-4">
      <p className="underline">CHOICES</p>
      <p className="text-xs text-red-500">{props.error}</p>
      <div className="flex flex-col gap-2">
        {choices?.map((choice: FlowChoice, i: number) => (
          <ChoiceRow
            key={choice.id}
            choice={choice}
            choices={choices}
            setChoices={props.onChange}
            onDelete={() => handleRemoveChoice(i)}
            index={i}
            maxCharCount={maxCharCount}
            disabled={disabled}
            onlyTitle={props?.onlyTitle ?? false}
          />
        ))}
      </div>
      {(!maxChoiceCount || choices?.length < maxChoiceCount) && (
        <div
          className={disabled ? "hidden" : "mt-2 flex flex-col"}
          onKeyDown={getHotkeyHandler([["Enter", submitAdd]])}
        >
          <div className="flex w-full grow flex-col gap-1">
            <div className="flex items-start gap-2">
              <Field className="-[0_0_92%]">
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={`${uid}-field`}>{translations("Title")} *</FieldLabel>
                      <InputGroup aria-invalid={fieldState.invalid}>
                        <InputGroupInput
                          id={`${uid}-field`}
                          placeholder={translations("Enter title here")}
                          {...field}
                          value={field.value ?? ""}
                          aria-invalid={fieldState.invalid}
                        />
                        {!!maxCharCount && (
                          <InputGroupAddon align="inline-end">
                            <LengthTracker
                              length={(field.value as string)?.length ?? 0}
                              maxValue={maxCharCount}
                            />
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                      {fieldState.error && (
                        <p className="text-xs text-red-500">{fieldState.error.message}</p>
                      )}
                    </Field>
                  )}
                />
              </Field>
              <div className="mt-6">
                <PopoverEmojiPicker
                  onEmojiClick={(e) => form.setValue("title", (form.getValues("title") ?? "") + e)}
                />
              </div>
            </div>
            {!props?.onlyTitle && (
              <>
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={`${uid}-field-2`}>
                        {translations("Description")}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id={`${uid}-field-2`}
                          placeholder={translations("Enter description here")}
                          {...field}
                          value={field.value ?? ""}
                        />
                        {!!MAX_DESCRIPTION_COUNT && (
                          <InputGroupAddon align="inline-end">
                            <LengthTracker
                              length={(field.value as string)?.length ?? 0}
                              maxValue={MAX_DESCRIPTION_COUNT}
                            />
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                    </Field>
                  )}
                />
                <Field className="grid grid-cols-2">
                  <Controller
                    name="metadata"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={`${uid}-metadata`}>Metadata</FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            id={`${uid}-metadata`}
                            placeholder="Enter metadata here"
                            {...field}
                            value={field.value ?? ""}
                          />
                          {!!MAX_METADATA_COUNT && (
                            <InputGroupAddon align="inline-end">
                              <LengthTracker
                                length={(field.value as string)?.length ?? 0}
                                maxValue={MAX_METADATA_COUNT}
                              />
                            </InputGroupAddon>
                          )}
                        </InputGroup>
                      </Field>
                    )}
                  />
                  <Controller
                    name="image"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <FileUploadButton
                        clearFile={() => {
                          field.onChange(null);
                          resetRef.current?.();
                        }}
                        handleFileChange={async (file) => {
                          if (file.size > 300000) {
                            form.setError("image", { message: "max image size is 300KB" });
                            return;
                          }
                          form.clearErrors("image");
                          const base64String = await FileConverter.fileToBase64(file);
                          field.onChange(base64String);
                        }}
                        resetRef={resetRef}
                        fileSrc={field.value as string}
                        error={fieldState.error?.message}
                        style={{ marginTop: "20px" }}
                      />
                    )}
                  />
                </Field>
              </>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 w-fit"
            onClick={submitAdd}
            disabled={fileUploadLoading}
          >
            <PlusIcon />
            {translations("Add choice")}
          </Button>
        </div>
      )}
    </Card>
  );
}

export class FileConverter {
  public static async fileToBase64(file: File, withStart: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64URL = reader.result as string;
        if (withStart) {
          resolve(base64URL);
          return;
        }
        const base64Data = base64URL.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        resolve(base64Data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}

interface ChoiceProps {
  choices: FlowChoice[];
  choice: FlowChoice;
  setChoices?: (choices: FlowChoice[]) => void;
  onDelete: () => void;
  index: number;
  maxCharCount?: number;
  disabled?: boolean;
  onlyTitle?: boolean;
}

function ChoiceRow({
  choices,
  choice,
  setChoices,
  onDelete,
  index,
  maxCharCount,
  disabled,
  onlyTitle,
}: ChoiceProps) {
  const uid = useId();
  const [openedEditModal, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const resetRef = useRef<(() => void) | null>(null);
  const { t: translations } = useTranslation();
  const choiceSchema = z.object(
    onlyTitle
      ? { title: z.string() }
      : {
          title: z
            .string()
            .trim()
            .min(1)
            .max(30)
            .refine((title) => {
              const isDuplicate = choices.some((c, i) => {
                const choiceValue = c?.title?.replace(/\s+/g, "");
                return i !== index && choiceValue === title.replace(/\s+/g, "");
              });
              return !isDuplicate;
            }, "Option already exists"),
          description: z.string().trim().max(MAX_DESCRIPTION_COUNT).optional(),
          metadata: z.string().trim().max(MAX_METADATA_COUNT).optional(),
          image: z.string().optional().nullable(),
        },
  );
  const schemaRef = useRef<z.ZodTypeAny>(choiceSchema);
  schemaRef.current = choiceSchema;

  const form = useForm<any>({
    resolver: schemaRefResolver(schemaRef),
    defaultValues: onlyTitle
      ? { title: "" }
      : { title: "", description: "", metadata: "", image: "" },
  });

  useEffect(() => {
    if (choice) {
      form.reset(choice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const handleEditChoice = async (values: any) => {
    const choiceObj = Object.fromEntries(
      Object.entries(values).filter(
        ([_key, value]) => typeof value === "string" && value.trim() !== "",
      ),
    );
    const updatedChoices = choices.map((c, i) => (i === index ? { ...c, ...choiceObj } : c));
    setChoices(updatedChoices);
    closeEditModal();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 shrink items-center gap-2">
        <Checkbox checked={false} />
        {choice?.image ? (
          <img
            src={`${DEFAULT_IMAGE_BASE64_START}${choice?.image}`}
            className="h-7.5 w-7.5 object-cover"
            alt={choice?.title}
          />
        ) : (
          <div className="h-7.5 w-7.5" />
        )}
        <div className="flex-1">
          <p>
            {translations("Title: ")}
            {choice?.title}
          </p>
          {choice?.description && (
            <p>
              {translations("Description: ")}
              {choice?.description}
            </p>
          )}
          {choice?.metadata && (
            <p>
              {translations("Metadata: ")}
              {choice?.metadata}
            </p>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={openEditModal} disabled={disabled}>
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2Icon />
      </Button>
      <Dialog open={openedEditModal} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">{translations("Edit Choice")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col justify-center gap-4">
            <div className="flex grow flex-col gap-2">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Title")} *</FieldLabel>
                    <InputGroup aria-invalid={fieldState.invalid}>
                      <InputGroupInput
                        id={`${uid}-field-3`}
                        placeholder={translations("Enter title here")}
                        {...field}
                        value={field.value ?? ""}
                        aria-invalid={fieldState.invalid}
                      />
                      {!!maxCharCount && (
                        <InputGroupAddon align="inline-end">
                          <LengthTracker
                            length={(field.value as string)?.length ?? 0}
                            maxValue={maxCharCount}
                          />
                        </InputGroupAddon>
                      )}
                    </InputGroup>
                    {fieldState.error && (
                      <p className="text-xs text-red-500">{fieldState.error.message}</p>
                    )}
                  </Field>
                )}
              />
              {!onlyTitle && (
                <>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-4`}>
                          {translations("Description")}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            id={`${uid}-field-4`}
                            placeholder={translations("Enter description here")}
                            {...field}
                            value={field.value ?? ""}
                          />
                          {!!MAX_DESCRIPTION_COUNT && (
                            <InputGroupAddon align="inline-end">
                              <LengthTracker
                                length={(field.value as string)?.length ?? 0}
                                maxValue={MAX_DESCRIPTION_COUNT}
                              />
                            </InputGroupAddon>
                          )}
                        </InputGroup>
                      </Field>
                    )}
                  />
                  <Controller
                    name="metadata"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel htmlFor={`${uid}-field-5`}>
                          {translations("Metadata")}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            id={`${uid}-field-5`}
                            placeholder={translations("Enter metadata here")}
                            {...field}
                            value={field.value ?? ""}
                          />
                          {!!MAX_METADATA_COUNT && (
                            <InputGroupAddon align="inline-end">
                              <LengthTracker
                                length={(field.value as string)?.length ?? 0}
                                maxValue={MAX_METADATA_COUNT}
                              />
                            </InputGroupAddon>
                          )}
                        </InputGroup>
                      </Field>
                    )}
                  />
                  <Controller
                    name="image"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <FileUploadButton
                        clearFile={() => {
                          field.onChange(null);
                          resetRef.current?.();
                        }}
                        handleFileChange={async (file) => {
                          if (file.size > 300000) {
                            form.setError("image", { message: "max image size is 300KB" });
                            return;
                          }
                          form.clearErrors("image");
                          const base64String = await FileConverter.fileToBase64(file);
                          field.onChange(base64String);
                        }}
                        resetRef={resetRef}
                        fileSrc={field.value as string}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </>
              )}
            </div>
            <Button onClick={form.handleSubmit(handleEditChoice)}>
              {translations("Update Choice")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
