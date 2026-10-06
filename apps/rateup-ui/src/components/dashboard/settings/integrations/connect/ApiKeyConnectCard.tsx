import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod/v4";

import { Button } from "@/components/ui/button.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { IntegrationFormCard } from "../IntegrationFormCard.tsx";

export interface ApiKeyField {
  name: string;
  label: string;
  /** Label once connected, when filling it in replaces what is stored ("Replace API key"). */
  replaceLabel?: string;
  type?: "password" | "text" | "url";
  placeholder?: string;
  description?: string;
}

type Values = Record<string, string>;

/**
 * The connect card for a provider that takes pasted credentials: an API key, or a key with a
 * domain or a secret beside it. Lifted from GetLead's.
 *
 * A connected org sees the stored credential as a mask, not an empty password box — an empty
 * box reads as "nothing saved". Editing is opt-in from the pencil, so a working connection
 * cannot be replaced by a stray paste. The secret itself never comes back from the API, only
 * `preview`, so a rotation is a re-paste rather than an edit.
 *
 * One layout for both modes: the mask and the first input share a slot, and the pencil and
 * the cross share a button, so opening the form does not move the actions or resize the card.
 */
export function ApiKeyConnectCard({
  title,
  description,
  fields,
  schema,
  connected,
  preview,
  loading = false,
  onConnect,
  connecting = false,
  onDisconnect,
  disconnecting = false,
  labels,
  children,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  fields: readonly ApiKeyField[];
  /** Validates the whole form; its keys are the fields' names. */
  schema: z.ZodType<Values, Values>;
  connected: boolean;
  /** The stored credential, masked, as the API returns it. */
  preview?: string;
  loading?: boolean;
  /** Resolve to close the form; reject to keep it open (the caller's mutation reports why). */
  onConnect: (values: Values) => Promise<unknown>;
  connecting?: boolean;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  labels?: { connect?: string; update?: string; pending?: string };
  /** Rendered under the fields: what connecting produced (a webhook URL to paste, say). */
  children?: ReactNode;
}>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const showForm = !connected || editing;

  const empty = Object.fromEntries(fields.map((field) => [field.name, ""]));
  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: empty,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await onConnect(values);
      form.reset(empty);
      setEditing(false);
    } catch {
      // Left open with what was typed; the mutation has already said what went wrong.
    }
  });

  const cancelEdit = () => {
    form.reset(empty);
    setEditing(false);
  };

  const [first, ...rest] = fields;

  const input = (field: ApiKeyField, index: number) => (
    <Controller
      key={field.name}
      name={field.name}
      control={form.control}
      render={({ field: control, fieldState }) => (
        <Input
          {...control}
          id={`api-key-${field.name}`}
          type={field.type ?? "password"}
          autoComplete="off"
          aria-invalid={fieldState.invalid}
          placeholder={field.placeholder}
          autoFocus={editing && index === 0}
        />
      )}
    />
  );

  const errorOf = (name: string) => form.formState.errors[name];

  return (
    <IntegrationFormCard
      title={title}
      description={description}
      onSubmit={onSubmit}
      actions={
        <>
          {showForm && (
            <Button type="submit" loading={connecting}>
              {connecting
                ? (labels?.pending ?? t("Checking..."))
                : connected
                  ? (labels?.update ?? t("Save"))
                  : (labels?.connect ?? t("Connect"))}
            </Button>
          )}
          {connected && onDisconnect && (
            <Button type="button" variant="ghost" loading={disconnecting} onClick={onDisconnect}>
              <IconTrash data-icon="inline-start" />
              {t("Disconnect")}
            </Button>
          )}
        </>
      }
    >
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <>
          {first && (
            <Field data-invalid={showForm && Boolean(errorOf(first.name))}>
              {showForm ? (
                <FieldLabel htmlFor={`api-key-${first.name}`}>
                  {connected ? (first.replaceLabel ?? first.label) : first.label}
                </FieldLabel>
              ) : (
                // A title, not a label: the mask is not a form control, and a label with a
                // dangling `for` is worse for a screen reader than a plain heading.
                <FieldTitle id={`api-key-${first.name}-label`}>{first.label}</FieldTitle>
              )}

              <div className="flex items-center gap-2">
                {showForm ? (
                  input(first, 0)
                ) : (
                  <code
                    aria-labelledby={`api-key-${first.name}-label`}
                    className="flex h-9 flex-1 items-center truncate rounded-md border bg-muted/40 px-2.5 font-mono text-sm text-foreground"
                  >
                    {preview ?? "••••••••"}
                  </code>
                )}

                {connected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    loading={connecting}
                    aria-label={editing ? t("Cancel") : (first.replaceLabel ?? t("Replace"))}
                    onClick={() => (editing ? cancelEdit() : setEditing(true))}
                  >
                    {editing ? <IconX className="size-4" /> : <IconPencil className="size-4" />}
                  </Button>
                )}
              </div>

              {showForm && first.description && (
                <FieldDescription>{first.description}</FieldDescription>
              )}
              {showForm && errorOf(first.name) && <FieldError errors={[errorOf(first.name)]} />}
            </Field>
          )}

          {showForm &&
            rest.map((field, index) => (
              <Field key={field.name} data-invalid={Boolean(errorOf(field.name))}>
                <FieldLabel htmlFor={`api-key-${field.name}`}>
                  {connected ? (field.replaceLabel ?? field.label) : field.label}
                </FieldLabel>
                {input(field, index + 1)}
                {field.description && <FieldDescription>{field.description}</FieldDescription>}
                {errorOf(field.name) && <FieldError errors={[errorOf(field.name)]} />}
              </Field>
            ))}
        </>
      )}

      {children}
    </IntegrationFormCard>
  );
}
