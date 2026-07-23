import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Label } from "@/components/ui/label.tsx";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { getLabel } from "@/utils/file-upload/upload.ts";

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

export const BroadCastTypeValue = ({ form, type }) => {
  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (type === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT) {
    const headerProps = form.getInputProps("header");
    return (
      <div className="flex w-full flex-col gap-1.5">
        <Label className="text-sm font-medium">Text</Label>
        <InputGroup>
          <InputGroupInput
            {...form.getFieldProps("header")}
            value={headerProps.value ?? ""}
            placeholder={translations("Header")}
            aria-invalid={!!headerProps.error}
          />
          <InputGroupAddon align="inline-end">
            <LengthTracker length={form?.values?.header?.length ?? 0} maxValue={60} atStart />
          </InputGroupAddon>
        </InputGroup>
        {headerProps.error && <p className="text-xs text-destructive">{headerProps.error}</p>}
      </div>
    );
  }

  const config = FILE_CONFIG[type];
  if (!config) return null;

  const { error } = form.getInputProps("header");

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > config.maxSize) {
      toast.error(`${config.label} must be smaller than ${config.sizeText}`);
      form.setFieldValue("header", null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    form.setFieldValue("header", file);
  };

  return (
    <div className="flex w-full max-w-100 flex-col gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        {getLabel(form.values.header, config.label)}
      </Button>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        config.helper && <p className="text-xs text-muted-foreground">{config.helper}</p>
      )}
    </div>
  );
};
