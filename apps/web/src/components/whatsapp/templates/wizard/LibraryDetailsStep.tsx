import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import { IconAlertTriangle, IconCircleCheck, IconLock, IconPencil } from "@tabler/icons-react";
import { useId } from "react";

import type { LibraryTemplate } from "@/backend/whatsapp/whatsapp.api";
import { WizardSection } from "@/components/dashboard/automation/components/wizard/WizardSection.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";

import type { LibraryInputs } from "./library.ts";
import { humanize } from "./library.ts";

/**
 * The second half of a library pick: Meta's wording, locked, and only the values the
 * entry asks for — button links and numbers, and any body text baked in for good.
 */
export function LibraryDetailsStep({
  entry,
  inputs,
  onInputsChange,
  onCustomize,
}: Readonly<{
  entry: LibraryTemplate;
  inputs: LibraryInputs;
  onInputsChange: (inputs: LibraryInputs) => void;
  /** Turns the entry into an ordinary template the reader can edit; it then needs review. */
  onCustomize: () => void;
}>) {
  const uid = useId();
  const setButton = (index: number, patch: LibraryInputs["buttons"][number]) =>
    onInputsChange({
      ...inputs,
      buttons: { ...inputs.buttons, [index]: { ...inputs.buttons[index], ...patch } },
    });
  const { buttons: requiredButtons, body_inputs: bodyInputs } = entry.required_inputs;

  return (
    <div className="flex flex-col gap-8">
      {entry.pre_approved ? (
        <Alert>
          <IconCircleCheck className="text-green-600" />
          <AlertTitle>Pre-approved by Meta</AlertTitle>
          <AlertDescription>
            Keep the wording as it is and the template can be used as soon as it's created.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <IconAlertTriangle className="text-amber-700 dark:text-amber-500" />
          <AlertTitle>Goes through Meta review</AlertTitle>
          <AlertDescription>
            The wording is already written to Meta's rules, so approval is usually quick — but this
            entry isn't marked pre-approved for your account.
          </AlertDescription>
        </Alert>
      )}

      <WizardSection
        title={
          <span className="flex items-center gap-1.5">
            <IconLock className="text-muted-foreground size-3.5" aria-hidden />
            Meta's wording
          </span>
        }
        hint="Variables like {{1}} are filled in each time you send it, from a campaign, automation or the inbox."
      >
        <div className="bg-muted/40 border-border flex flex-col gap-2 rounded-xl border p-4">
          {entry.header_type === "TEXT" && entry.header && (
            <p className="text-sm font-semibold">{entry.header}</p>
          )}
          {entry.header_type && entry.header_type !== "TEXT" && (
            <p className="text-muted-foreground text-xs">
              {humanize(entry.header_type)} header — attached when you send it.
              {entry.header_type === "DOCUMENT" && " Library templates accept PDF documents only."}
            </p>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
          {entry.footer && <p className="text-muted-foreground text-xs">{entry.footer}</p>}
          {entry.buttons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.buttons.map((button, index) => (
                <span
                  key={index}
                  className="bg-card border-border rounded-md border px-2 py-1 text-xs font-medium"
                >
                  {button.text ?? humanize(button.type)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onCustomize}>
            <IconPencil className="size-4" aria-hidden />
            Customize the wording
          </Button>
        </div>
      </WizardSection>

      {requiredButtons.length > 0 && (
        <WizardSection title="Where the buttons go">
          {requiredButtons.map((required) => {
            const value = inputs.buttons[required.index];
            const id = `${uid}-button-${required.index}`;
            const label = required.text ? `“${required.text}”` : `Button ${required.index + 1}`;
            if (required.needs === "phone_number") {
              return (
                <Field key={required.index}>
                  <FieldLabel htmlFor={id}>{label} calls</FieldLabel>
                  <Input
                    id={id}
                    type="tel"
                    inputMode="tel"
                    placeholder="+919876543210"
                    value={value?.phoneNumber ?? ""}
                    onChange={(event) =>
                      setButton(required.index, { phoneNumber: event.target.value })
                    }
                  />
                  <FieldDescription>With the country code, e.g. +91.</FieldDescription>
                </Field>
              );
            }
            const dynamic = value?.url?.includes("{{1}}");
            return (
              <div key={required.index} className="flex flex-col gap-3">
                <Field>
                  <FieldLabel htmlFor={id}>{label} opens</FieldLabel>
                  <Input
                    id={id}
                    type="url"
                    placeholder="https://yourstore.com/orders/{{1}}"
                    value={value?.url ?? ""}
                    onChange={(event) => setButton(required.index, { url: event.target.value })}
                  />
                  <FieldDescription>
                    End it with {"{{1}}"} to add a different value to the link on every send, such
                    as an order number.
                  </FieldDescription>
                </Field>
                {dynamic && (
                  <Field>
                    <FieldLabel htmlFor={`${id}-example`}>Example value for {"{{1}}"}</FieldLabel>
                    <Input
                      id={`${id}-example`}
                      placeholder="10023"
                      value={value?.urlSuffixExample ?? ""}
                      onChange={(event) =>
                        setButton(required.index, { urlSuffixExample: event.target.value })
                      }
                    />
                  </Field>
                )}
              </div>
            );
          })}
        </WizardSection>
      )}

      {bodyInputs.length > 0 && (
        <WizardSection
          title="Fixed text"
          hint="These become a permanent part of the message — use something that never changes, like your business name, never a customer's details."
        >
          {bodyInputs.map((input) => {
            const id = `${uid}-body-${input.param_name}`;
            return (
              <Field key={input.param_name}>
                <FieldLabel htmlFor={id}>{humanize(input.param_name)}</FieldLabel>
                <Input
                  id={id}
                  value={inputs.body[input.param_name] ?? ""}
                  onChange={(event) =>
                    onInputsChange({
                      ...inputs,
                      body: { ...inputs.body, [input.param_name]: event.target.value },
                    })
                  }
                />
              </Field>
            );
          })}
        </WizardSection>
      )}

      {requiredButtons.length === 0 && bodyInputs.length === 0 && (
        <p className="text-muted-foreground text-sm">
          This one needs nothing from you. Continue to review it.
        </p>
      )}
    </div>
  );
}
