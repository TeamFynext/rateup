import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { getLabel } from "@/utils/file-upload/upload.ts";

import { errorAt, registerField, setValue, type TemplateForm } from "./template-form.ts";

const FILE_CONFIG = {
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE]: {
    accept: "image/jpeg,image/jpg,image/png",
    maxSize: 5 * 1024 * 1024,
    label: "Image",
    helper: "Max file size is 5MB",
    sizeText: "5MB",
  },
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO]: {
    accept: "video/mp4",
    maxSize: 16 * 1024 * 1024,
    label: "Video",
    helper: "Max file size is 16MB",
    sizeText: "16MB",
  },
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT]: {
    accept: "application/pdf",
    maxSize: 100 * 1024 * 1024,
    label: "Document",
    helper: "Max file size is 100MB",
    sizeText: "100MB",
  },
};

export const BroadCastTypeValue = ({
  form,
  type,
}: Readonly<{ form: TemplateForm; type: string }>) => {
  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const error = errorAt(form, "header");
  const header = form.watch("header");

  if (type === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT) {
    return (
      <Field className="gap-1.5" data-invalid={!!error}>
        <FieldLabel htmlFor={`${uid}-header`}>Text</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id={`${uid}-header`}
            {...registerField(form, "header")}
            placeholder={translations("Header")}
            aria-invalid={!!error}
          />
          <InputGroupAddon align="inline-end">
            <LengthTracker
              length={typeof header === "string" ? header.length : 0}
              maxValue={60}
              atStart
            />
          </InputGroupAddon>
        </InputGroup>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }

  const config = FILE_CONFIG[type];
  if (!config) return null;

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > config.maxSize) {
      toast.error(`${config.label} must be smaller than ${config.sizeText}`);
      setValue(form, "header", null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setValue(form, "header", file);
  };

  return (
    <Field className="w-full max-w-100 gap-1.5" data-invalid={!!error}>
      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        aria-label={`Select a ${config.label}`}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        aria-invalid={!!error}
        onClick={() => fileInputRef.current?.click()}
      >
        {getLabel((header as File | string) ?? "", config.label)}
      </Button>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        config.helper && <FieldDescription>{config.helper}</FieldDescription>
      )}
    </Field>
  );
};
