import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const units = [
  { value: "px", label: "px" },
  { value: "%", label: "%" },
];

interface IFrameModalProps {
  close: () => void;
  shareUrl: string;
}

const IFrameModal = ({ close, shareUrl }: IFrameModalProps) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [values, setValues] = useState({
    width: 300,
    height: 600,
    widthUnit: "px",
    heightUnit: "px",
  });

  let hasError = false;
  const errors = { width: "", height: "" };
  let iframe = "";

  if (values.widthUnit === "%" && values.width > 100) {
    errors.width = "Maximum 100% is allowed";
    hasError = true;
  }
  if (values.heightUnit === "%" && values.height > 100) {
    errors.height = "Maximum 100% is allowed";
    hasError = true;
  }
  if (!values.width || !values.height) {
    hasError = true;
  }
  if (!hasError) {
    const width = values.width + values.widthUnit;
    const height = values.height + values.heightUnit;
    iframe = `<iframe title="Survey" src="${shareUrl}" width="${width}" height="${height}"></iframe>`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(iframe).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center">{translations("Create an iframe to embed survey")}</p>
      <div className="grid grid-cols-12 gap-3">
        <Field className="col-span-9" data-invalid={!!errors.width}>
          <FieldLabel htmlFor={`${uid}-field`}>{translations("Width")}</FieldLabel>
          <Input
            id={`${uid}-field`}
            type="number"
            min={0}
            step={1}
            placeholder={translations("Enter width of iframe")}
            value={values.width}
            aria-invalid={!!errors.width}
            onChange={(e) => setValues((prev) => ({ ...prev, width: Number(e.target.value) }))}
          />
          {errors.width && <FieldError>{errors.width}</FieldError>}
        </Field>
        <Field className="col-span-3">
          <FieldLabel htmlFor={`${uid}-field-2`} className="sr-only">
            {translations("Width unit")}
          </FieldLabel>
          <Select
            value={values.widthUnit}
            onValueChange={(unit) => setValues((prev) => ({ ...prev, widthUnit: unit ?? "" }))}
            items={units}
          >
            <SelectTrigger id={`${uid}-field-2`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="col-span-9" data-invalid={!!errors.height}>
          <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Height")}</FieldLabel>
          <Input
            id={`${uid}-field-3`}
            type="number"
            min={0}
            step={1}
            placeholder={translations("Enter height of iframe")}
            value={values.height}
            aria-invalid={!!errors.height}
            onChange={(e) => setValues((prev) => ({ ...prev, height: Number(e.target.value) }))}
          />
          {errors.height && <FieldError>{errors.height}</FieldError>}
        </Field>
        <Field className="col-span-3">
          <FieldLabel htmlFor={`${uid}-field-4`} className="sr-only">
            {translations("Height unit")}
          </FieldLabel>
          <Select
            value={values.heightUnit}
            onValueChange={(unit) => setValues((prev) => ({ ...prev, heightUnit: unit ?? "" }))}
            items={units}
          >
            <SelectTrigger id={`${uid}-field-4`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="font-mono text-xs break-all text-muted-foreground">{iframe}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={close}>
              {translations("cancel")}
            </Button>
            <Button
              variant={copied ? "outline" : "default"}
              onClick={handleCopy}
              disabled={hasError}
            >
              {copied ? (
                <IconCheck data-icon="inline-start" />
              ) : (
                <IconCopy data-icon="inline-start" />
              )}
              {copied ? translations("Copied") : translations("Copy code")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IFrameModal;
