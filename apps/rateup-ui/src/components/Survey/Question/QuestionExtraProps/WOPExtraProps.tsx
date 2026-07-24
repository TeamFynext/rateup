import { IconX } from "@tabler/icons-react";
import { useId, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import { DEFAULT_WOP } from "../../TakeSurvey/TakeSurveyComponent/util.tsx";

// ── ColorInput ────────────────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      <FieldTitle className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </FieldTitle>
      <div
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 hover:bg-accent"
        onClick={() => inputRef.current?.click()}
      >
        <span
          className="size-5 shrink-0 rounded-sm border border-black/10 shadow-sm"
          style={{ backgroundColor: value ?? "#000000" }}
        />
        <input
          ref={inputRef}
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <span className="flex-1 font-mono text-xs text-muted-foreground">
          {value?.toUpperCase() ?? "#000000"}
        </span>
      </div>
    </div>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({
  label,
  value = [],
  onChange,
  placeholder,
  required,
  error,
}: {
  label: string;
  value?: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="flex flex-col gap-1">
      <FieldTitle className="text-sm">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </FieldTitle>
      <div className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-sm opacity-60 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
            if (e.key === "Backspace" && !input && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          aria-label={label}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[120px] flex-1 rounded-sm bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── WOPExtraProps ─────────────────────────────────────────────────────────────

type WopValues = {
  imageSrc?: string;
  primaryColor: string;
  primaryColoraround: string;
  contrastColor: string;
  size: number;
  segments: string[];
  segColors: string[];
};

const WOPExtraProps = ({ form }) => {
  const uid = useId();
  const { t: translations } = useTranslation();

  const schema = z
    .object({
      imageSrc: z.string().optional(),
      primaryColor: z.string().min(1),
      primaryColoraround: z.string().min(1),
      contrastColor: z.string().min(1),
      size: z.number().min(1),
      segments: z
        .array(z.string())
        .min(2, { message: translations("Minimum two segments needed") }),
      segColors: z.array(z.string()),
    })
    .check((ctx) => {
      const { value: values } = ctx;
      if (!values.imageSrc && values.segColors?.length !== values.segments?.length) {
        ["segments", "segColors"].forEach((field) => {
          ctx.issues.push({
            path: [field],
            code: "custom",
            message: translations("Segments and segColors should have equal number of data"),
            input: "",
          });
        });
      }
      try {
        if (values.imageSrc) new URL(values.imageSrc);
      } catch {
        ctx.issues.push({
          path: ["imageSrc"],
          code: "custom",
          message: translations("Image URL should be valid"),
          input: "",
        });
      }
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WopValues>({
    defaultValues: form.values.wop || DEFAULT_WOP,
  });

  const values = watch();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = schema.safeParse(values);
      if (result.success) {
        form.setFieldValue("wop", values);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [JSON.stringify(values)]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <TagInput
        label={translations("Segments")}
        value={values.segments}
        onChange={(v) => setValue("segments", v)}
        placeholder={translations("Type and press Enter")}
        required
        error={errors.segments?.message as string}
      />

      <TagInput
        label="segColors"
        value={values.segColors}
        onChange={(v) => setValue("segColors", v)}
        placeholder={translations("Type and press Enter")}
        error={errors.segColors?.message as string}
      />

      <FieldGroup>
        <Field data-invalid={!!errors.imageSrc}>
          <FieldLabel htmlFor={`${uid}-field`}>{translations("Image URL")}</FieldLabel>
          <div className="flex items-center gap-1">
            <Input
              id={`${uid}-field`}
              type="url"
              placeholder={translations("Enter the url of image")}
              {...register("imageSrc")}
            />
            {values.imageSrc && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => setValue("imageSrc", "")}
              >
                <IconX className="size-4" />
              </Button>
            )}
          </div>
          {errors.imageSrc && (
            <FieldDescription className="text-destructive">
              {errors.imageSrc.message}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <ColorInput
        label={translations("Primary Color")}
        value={values.primaryColor}
        onChange={(v) => setValue("primaryColor", v)}
        required
      />

      <FieldGroup>
        <Field data-invalid={!!errors.size}>
          <FieldLabel htmlFor={`${uid}-field-2`}>
            {translations("Wheel Size")} <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${uid}-field-2`}
            type="number"
            placeholder={translations("Enter the size of wheel")}
            {...register("size", { valueAsNumber: true })}
          />
          {errors.size && (
            <FieldDescription className="text-destructive">{errors.size.message}</FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <ColorInput
        label={translations("Primary Color Around")}
        value={values.primaryColoraround}
        onChange={(v) => setValue("primaryColoraround", v)}
        required
      />

      <div />

      <ColorInput
        label={translations("Contrast Color")}
        value={values.contrastColor}
        onChange={(v) => setValue("contrastColor", v)}
        required
      />
    </div>
  );
};

export default WOPExtraProps;
