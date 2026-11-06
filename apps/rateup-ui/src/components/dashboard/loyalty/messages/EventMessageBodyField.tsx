import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";

import { messageVariables, variableHint } from "./loyaltyMessageCatalog.ts";
import { MessageBodyEditor } from "./MessageBodyEditor.tsx";

interface EventMessageBodyFieldProps {
  id: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  error?: { message?: string } | undefined;
  rows?: number;
  /** What the dispatcher fills `{{1}}`, `{{2}}` … with, in that order. */
  params: readonly string[];
}

/**
 * A notification's body, as the setup wizard and the Messages page both edit it: the
 * WhatsApp-flavoured editor with one-click chips for the variables this event carries,
 * and a line under it saying what each one becomes when the message sends.
 */
export function EventMessageBodyField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  invalid,
  error,
  rows = 3,
  params,
}: Readonly<EventMessageBodyFieldProps>) {
  const { t } = useTranslation();
  const variables = messageVariables(params);
  return (
    <Field data-invalid={invalid}>
      {label && (
        <FieldLabel htmlFor={id} className="text-xs">
          {label}
        </FieldLabel>
      )}
      <MessageBodyEditor
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        invalid={invalid}
        variables={variables}
      />
      {variables.length > 0 && (
        <FieldDescription className="text-xs">
          {t("Filled in when it sends:")} <span className="font-mono">{variableHint(params)}</span>
        </FieldDescription>
      )}
      {invalid && error && <FieldError errors={[error]} />}
    </Field>
  );
}
