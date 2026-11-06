import { Button } from "@rateup/ui/components/button";
import { Card } from "@rateup/ui/components/card";
import { Field, FieldError, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { Textarea } from "@rateup/ui/components/textarea";
import { IconCircleCheck, IconRefresh } from "@tabler/icons-react";
import type { UseMutationResult } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useId, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSurvey } from "@/backend/surveys/surveys.query";
import { useUpdateFlowMutation, useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import { cn } from "@/lib/utils";
import { SaveStatus } from "@/types/enums.ts";
import type { WaFlowStartMessageConfig } from "@/types/global";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";
import { generateWaSurveyIdentifier_byName } from "@/utils/whatsapp/wa_url.tsx";

import type { LengthTrackerProps } from "../../input/LengthTracker.tsx";
import { LengthTracker } from "../../input/LengthTracker.tsx";
import { WaTemplateMessage } from "../../whatsapp/wa-template-bubble.tsx";
import { WaBubble, WaWallpaper } from "../../whatsapp/whatsapp-preview-shell.tsx";

const exceed = (l: number) => `Cannot exceed ${l} characters.`;
const empty = `Cannot be empty.`;

/** Checks is all properties in ob1 is equal to that in ob2 */
function isEqual(ob1: object | undefined, ob2: object | undefined): boolean {
  const a = (ob1 ?? {}) as Record<string, unknown>;
  const b = (ob2 ?? {}) as Record<string, unknown>;
  return Object.keys(a).every((k) => {
    if (a[k] != b[k]) console.log(k, a[k], b[k]);
    return a[k] == b[k];
  });
}

interface SimpleForm<T> {
  values: T;
  setValues: (values: T) => void;
  setFieldValue: (name: keyof T, value: unknown) => void;
  setInitialValues: (values: T) => void;
  reset: () => void;
  getInputProps: (name: keyof T) => { value: string; onChange: (e: unknown) => void };
  errors: Partial<Record<keyof T, string>>;
}

function useSimpleForm<T extends object>(opts: {
  initialValues: T;
  validate?: Partial<Record<keyof T, (value: T[keyof T]) => string | undefined | false>>;
}): SimpleForm<T> {
  const [values, setValues] = useState<T>(opts.initialValues);
  const initialRef = useRef<T>(opts.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setInitialValues = (newInitial: T) => {
    initialRef.current = newInitial;
  };

  const setFieldValue = (name: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    const validator = opts.validate?.[name];
    if (validator) {
      setErrors((prev) => ({ ...prev, [name]: validator(value as T[keyof T]) || undefined }));
    }
  };

  const reset = () => {
    setValues(initialRef.current);
    setErrors({});
  };

  const getInputProps = (name: keyof T) => ({
    // Every field this form drives is a text input.
    value: typeof values[name] === "string" ? (values[name] as string) : "",
    onChange: (e: unknown) =>
      setFieldValue(
        name,
        e && typeof e === "object" && "target" in e
          ? (e as { target: { value: unknown } }).target.value
          : e,
      ),
  });

  return { values, setValues, setFieldValue, setInitialValues, reset, getInputProps, errors };
}

function FlowShareTemplateEditor({
  form,
  dbFlowId,
  updateMutation,
  initialValues,
}: {
  form: SimpleForm<WaFlowTemplateMessage>;
  dbFlowId: string;
  updateMutation: UseMutationResult<
    unknown,
    Error,
    { dbFlowId: string; data: Partial<Omit<DbFlow, "dbFlowId">> },
    unknown
  >;
  initialValues: WaFlowTemplateMessage;
}) {
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const [status, setStatus] = useState(SaveStatus.saved);
  const fileInputRef = useRef<HTMLInputElement>(null);

  form.setInitialValues(initialValues);

  useEffect(() => {
    if (!isEqual(form.values, initialValues)) return;
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.templateMessage)) return;
    form.reset();
  }, [dbFlow]);
  // autosave

  useEffect(() => {
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.templateMessage)) return;
    setStatus(SaveStatus.notSaved);

    const timer = setTimeout(() => {
      setStatus(SaveStatus.saving);

      updateMutation.mutate(
        {
          dbFlowId,
          data: { templateMessage: form.values },
        },
        {
          onSuccess: () => setStatus(SaveStatus.saved),
          onError: () => setStatus(SaveStatus.notSaved),
        },
      );
    }, 1000 * 1.5);

    return () => clearTimeout(timer);
  }, [form.values]);

  const max_mb = 1;
  const onImageUpload = (file: File) => {
    if (!file) return;
    // WhatsApp rejects any other format (WebP, SVG, GIF...) as a message header image.
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error(translations("Only PNG or JPG images are supported"));
      return;
    }
    if (file.size > max_mb * 1024 * 1024) {
      toast.error(`Max file size is ${max_mb} MB`);
      return;
    }
    setImageToUpload(file);
  };
  const { t: translations } = useTranslation();
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);

  // saving image
  useEffect(() => {
    if (imageToUpload) {
      uploadFile(imageToUpload)
        .then((fileKey) => {
          form.setFieldValue("headerImage", fileKey);
        })
        .catch((e) => console.error(e));
    }
  }, [imageToUpload]);

  function handleRemoveImage() {
    form.setFieldValue("headerImage", "");
    setImageToUpload(null);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center gap-4">
        <h4 className="text-lg font-semibold">{translations("Edit Template Message")}</h4>
        <SaveStatusIndicator status={status} />
      </div>
      <div className="flex flex-1 flex-col gap-4 rounded-lg bg-neutral-100 p-4">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageUpload(file);
              e.target.value = "";
            }}
          />
          <Button type="button" onClick={() => fileInputRef.current?.click()}>
            {imageToUpload ? translations("Change Image") : translations("Upload Image")}
          </Button>

          <Button type="button" variant="outline" onClick={handleRemoveImage}>
            {translations("Remove Image")}
          </Button>
        </div>

        <TextareaWithLengthTracker
          label={translations("Body")}
          {...form.getInputProps("body")}
          maxValue={1024}
        />
        <TextInputWithLengthTracker
          label={translations("Footer")}
          {...form.getInputProps("footer")}
          maxValue={60}
        />
        <TextInputWithLengthTracker label={"CTA"} maxValue={20} {...form.getInputProps("cta")} />
      </div>
    </div>
  );
}

interface FlowStartMessageEditorProps {
  form: SimpleForm<WaFlowStartMessageConfig>;
  dbFlowId: string;
  updateMutation: UseMutationResult<
    unknown,
    Error,
    { dbFlowId: string; data: Partial<Omit<DbFlow, "dbFlowId">> },
    unknown
  >;
  initialValues: WaFlowStartMessageConfig;
}
function FlowStartMessageEditor({
  form,
  dbFlowId,
  updateMutation,
  initialValues,
}: FlowStartMessageEditorProps) {
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const [status, setStatus] = useState(SaveStatus.saved);

  form.setInitialValues(initialValues);

  useEffect(() => {
    if (!isEqual(form.values, initialValues)) return;
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.startMessageConfig)) return;
    form.reset();
  }, [dbFlow]);
  // autosave

  useEffect(() => {
    if (!dbFlow) return;
    if (isEqual(form.values, dbFlow.startMessageConfig)) return;
    setStatus(SaveStatus.notSaved);

    const timer = setTimeout(() => {
      setStatus(SaveStatus.saving);

      updateMutation.mutate(
        {
          dbFlowId,
          data: { startMessageConfig: form.values },
        },
        {
          onSuccess: () => setStatus(SaveStatus.saved),
          onError: () => setStatus(SaveStatus.notSaved),
        },
      );
    }, 1000 * 1.5);

    return () => clearTimeout(timer);
  }, [form.values]);
  const { t: translations } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center gap-4">
        <h4 className="text-lg font-semibold">{translations("Edit Start Message")}</h4>
        <SaveStatusIndicator status={status} />
      </div>
      <div className="flex flex-1 flex-col gap-4 rounded-lg bg-neutral-100 p-4">
        <TextareaWithLengthTracker
          label={translations("Body")}
          {...form.getInputProps("prefix")}
          maxValue={1024}
        />
        <TextareaWithLengthTracker
          label={translations("Suffix")}
          {...form.getInputProps("suffix")}
          maxValue={1024}
        />
      </div>
    </div>
  );
}

export function FlowShareMessageEditor({ selectedTeamCode }: { selectedTeamCode: string }) {
  const params = useParams({
    strict: false,
  });
  const dbFlowId = params.dbFlowId as string;

  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const { data: survey } = useSurvey(dbFlow?.surveyId ?? "");
  const updateMutation = useUpdateFlowMutation();
  const templateInitialValues = generateTemplateInitialValues(dbFlow!);

  const templateForm = useSimpleForm({
    initialValues: templateInitialValues,
    validate: templateFormValidation,
  });

  const startMessageInitialValues = generateStartMessageInitialValues(dbFlow!);
  const startMessageForm = useSimpleForm<WaFlowStartMessageConfig>({
    initialValues: startMessageInitialValues,
  });
  const { t: translations } = useTranslation();
  return (
    <Card className="overflow-x-auto p-[30px] shadow-[rgba(99,99,99,0.2)_0px_2px_8px_0px]">
      <div className="flex h-full items-stretch gap-4">
        <div className="flex flex-1 flex-col gap-8">
          <FlowStartMessageEditor
            form={startMessageForm}
            dbFlowId={dbFlowId}
            updateMutation={updateMutation}
            initialValues={startMessageInitialValues}
          />
          <FlowShareTemplateEditor
            form={templateForm}
            dbFlowId={dbFlowId}
            updateMutation={updateMutation}
            initialValues={templateInitialValues}
          />
        </div>
        <div className="flex max-w-[400px] flex-1 flex-col">
          <div className="mb-1 flex items-center justify-center gap-4">
            <h4 className="text-lg font-semibold">{translations("Preview")}</h4>
          </div>
          <WaWallpaper className="mx-3 justify-end gap-3 overflow-hidden rounded-lg p-4">
            <WaBubble outgoing>
              {startMessageForm.values.prefix}
              {startMessageForm.values.prefix && "\n"}
              <code className="inline-block rounded bg-black/5 px-1 font-[inherit] text-[13px] opacity-80 dark:bg-white/10">
                {generateWaSurveyIdentifier_byName(
                  survey?.title ?? "",
                  selectedTeamCode,
                ).replaceAll("`", "")}
              </code>
              {startMessageForm.values.suffix && `\n${startMessageForm.values.suffix}`}
            </WaBubble>

            <WaTemplateMessage
              aboveBody={
                templateForm.values.headerImage ? (
                  <img
                    src={getFileUrlFromKey(templateForm.values.headerImage)}
                    alt=""
                    className="w-full rounded-md"
                  />
                ) : undefined
              }
              header={
                templateForm.values.header
                  ? { format: "TEXT", text: templateForm.values.header }
                  : null
              }
              body={templateForm.values.body}
              footer={templateForm.values.footer}
              buttons={
                templateForm.values.cta
                  ? [{ type: "QUICK_REPLY", text: templateForm.values.cta }]
                  : []
              }
            />
          </WaWallpaper>
        </div>
      </div>
    </Card>
  );
}

interface TextInputWithLengthTrackerProps
  extends Omit<React.ComponentProps<"input">, "value">, Omit<LengthTrackerProps, "length"> {
  label?: string;
  value?: string;
}

function TextInputWithLengthTracker(props: TextInputWithLengthTrackerProps) {
  const uid = useId();
  const { maxValue, label, value, ...restOfProps } = props;
  const length = value?.length || 0;

  return (
    <Field>
      {label && <FieldLabel htmlFor={`${uid}-field`}>{label}</FieldLabel>}
      <div className="relative">
        <Input id={`${uid}-field`} className="pr-20" value={value} {...restOfProps} />
        <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
          <LengthTracker length={length} maxValue={maxValue} />
        </div>
      </div>
    </Field>
  );
}

interface TextareaWithLengthTrackerProps
  extends
    Omit<React.ComponentProps<"textarea">, "value" | "style">,
    Omit<LengthTrackerProps, "length"> {
  label?: string;
  value?: string;
  error?: React.ReactNode;
  /** Style applied to the outer field wrapper (e.g. margin). */
  style?: React.CSSProperties;
  /** Style applied directly to the textarea element (e.g. font-size/weight). */
  inputStyle?: React.CSSProperties;
}

export function TextareaWithLengthTracker(props: TextareaWithLengthTrackerProps) {
  const uid = useId();
  const { maxValue, label, value, error, className, style, inputStyle, ...restOfProps } = props;
  const length = value?.length || 0;

  return (
    <Field data-invalid={!!error} style={style}>
      {label && <FieldLabel htmlFor={`${uid}-field-2`}>{label}</FieldLabel>}
      <div className="relative">
        <Textarea
          id={`${uid}-field-2`}
          className={cn("rounded-xl pr-20", className)}
          style={inputStyle}
          value={value}
          aria-invalid={!!error}
          {...restOfProps}
        />
        <div className="pointer-events-none absolute right-2 bottom-2">
          <LengthTracker length={length} maxValue={maxValue} />
        </div>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

interface SaveStatusProps {
  readonly status: SaveStatus;
}
function SaveStatusIndicator({ status }: SaveStatusProps) {
  return (
    <div className="flex items-center gap-1 text-gray-500">
      {status === SaveStatus.saved ? (
        <IconCircleCheck />
      ) : (
        <IconRefresh className={status === SaveStatus.saving ? "animate-spin" : ""} />
      )}
      <span>{status}</span>
    </div>
  );
}

function generateTemplateInitialValues(dbFlow: DbFlow): WaFlowTemplateMessage {
  return {
    header: dbFlow.templateMessage.header || "",
    headerImage: dbFlow.templateMessage.headerImage || undefined,
    body: dbFlow.templateMessage.body || "Would you like to start survey?",
    footer: dbFlow.templateMessage.footer || "",
    cta: dbFlow.templateMessage.cta || "Open",
  };
}

function generateStartMessageInitialValues(dbFlow: DbFlow): WaFlowStartMessageConfig {
  return {
    prefix: dbFlow.startMessageConfig.prefix || "Send this message to start survey.\n",
    suffix: dbFlow.startMessageConfig.suffix || "",
  };
}

const templateFormValidation = {
  // `header`/`footer` are optional on the template message.
  header: (h: string | undefined) => (h?.length ?? 0) > 60 && exceed(60),
  body: (b: string | undefined) => {
    if (!b?.length) {
      return empty;
    } else if (b.length > 1024) {
      return exceed(1024);
    }
  },
  footer: (f: string | undefined) => (f?.length ?? 0) > 60 && exceed(60),
  cta: (c: string | undefined) => {
    if (!c?.length) {
      return empty;
    } else if (c.length > 20) {
      return exceed(20);
    }
  },
};
