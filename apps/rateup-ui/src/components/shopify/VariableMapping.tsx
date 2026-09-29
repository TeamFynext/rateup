import { IconLoader2 } from "@tabler/icons-react";
import { useId, useMemo } from "react";

import { useCustomFields } from "@/backend/campaign/contacts/contacts.query";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";

import { Field, FieldDescription, FieldLabel } from "../ui/field.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { contactVariablePresets, shopifyVariablePresets } from "./shopifyVariables.ts";

interface VariableMappingProps {
  waTemplateId: string;
  value: { templateParamIndex: number; shopifyPath: string }[];
  onChange: (value: { templateParamIndex: number; shopifyPath: string }[]) => void;
  /** The variable filling the `{{1}}` at the end of the template's URL button. */
  buttonValue?: string;
  onButtonChange?: (value: string | undefined) => void;
  triggerEvent?: string;
}

/** The base a URL button needs for a tracked recovery link; the code is its `{{1}}`. */
const TRACKED_LINK_BASE = `${import.meta.env.VITE_API_URL}/api/public/r/`;

const VariableMapping = ({
  waTemplateId,
  value,
  onChange,
  buttonValue,
  onButtonChange,
  triggerEvent,
}: VariableMappingProps) => {
  const uid = useId();
  const { data: template, isLoading } = useWaTemplateById(waTemplateId);
  const isShopify = triggerEvent === "SHOPIFY_EVENT";
  const { data: customFields } = useCustomFields();

  const variableOptions = useMemo(() => {
    if (isShopify) return shopifyVariablePresets;
    const customOptions =
      customFields?.map((cf) => ({
        label: `Custom: ${cf.name}`,
        value: `contact.custom.${cf.id}`,
      })) ?? [];
    return [...contactVariablePresets, ...customOptions];
  }, [isShopify, customFields]);

  const variables = useMemo(() => {
    if (!template?.data?.components) return [];
    const bodyComponent = template.data.components.find(
      (c: { type?: string }) => c.type === "BODY" || c.type === "body",
    );
    // WhatsApp templates use example.body_text[0] to store examples for parameters {{1}}, {{2}}...
    const bodyExamples = bodyComponent?.example?.body_text?.[0];
    return Array.isArray(bodyExamples) ? bodyExamples : [];
  }, [template]);

  // Meta allows a variable only at the end of a URL button's address.
  const urlButton = useMemo(() => {
    const buttons = template?.data?.components?.find(
      (c: { type?: string }) => c.type === "BUTTONS" || c.type === "buttons",
    )?.buttons;
    return buttons?.find(
      (button: { type?: string; url?: string }) =>
        button.type === "URL" && button.url?.endsWith("{{1}}"),
    ) as { text?: string; url?: string } | undefined;
  }, [template]);
  const buttonIsTracked = Boolean(urlButton?.url?.startsWith(TRACKED_LINK_BASE));

  const handleMappingChange = (index: number, shopifyPath: string) => {
    const newValue = [...value];
    const existingIndex = newValue.findIndex((m) => m.templateParamIndex === index);
    if (existingIndex !== -1) {
      newValue[existingIndex] = { ...newValue[existingIndex], shopifyPath };
    } else {
      newValue.push({ templateParamIndex: index, shopifyPath });
    }
    onChange(newValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <IconLoader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading template variables...</span>
      </div>
    );
  }

  if (variables.length === 0 && !urlButton) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Variable Mapping</h4>
        <p className="text-sm text-muted-foreground">
          {isShopify
            ? "Map your WhatsApp template variables to Shopify data."
            : "Map your WhatsApp template variables to contact fields."}
        </p>
      </div>
      <Field className="grid sm:grid-cols-2">
        {variables.map((example, i) => {
          const currentMapping = value.find((m) => m.templateParamIndex === i);
          return (
            <Field key={i}>
              <FieldLabel htmlFor={`${uid}-variable-e-g-${i}`} className="text-xs">
                Variable {"{{"}
                {i + 1}
                {"}}"} (e.g. {example})
              </FieldLabel>
              <Select
                value={currentMapping?.shopifyPath || ""}
                onValueChange={(val) => handleMappingChange(i, val ?? "")}
                items={variableOptions}
              >
                <SelectTrigger id={`${uid}-variable-e-g-${i}`} className="h-9">
                  <SelectValue
                    placeholder={isShopify ? "Select Shopify Field" : "Select Contact Field"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {variableOptions.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        })}
      </Field>
      {urlButton && onButtonChange && (
        <Field>
          <FieldLabel htmlFor={`${uid}-button-url`} className="text-xs">
            Button “{urlButton.text}” link ending
          </FieldLabel>
          <Select
            value={buttonValue ?? ""}
            onValueChange={(val) => onButtonChange(val || undefined)}
            items={variableOptions}
          >
            <SelectTrigger id={`${uid}-button-url`} className="h-9 sm:w-1/2">
              <SelectValue placeholder="Use the template's sample value" />
            </SelectTrigger>
            <SelectContent>
              {variableOptions.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isShopify && (
            <FieldDescription className="text-xs">
              {buttonIsTracked
                ? "Pick “Checkout Recovery Link — button code” to send a tracked cart link."
                : `For a tracked cart link that counts clicks and orders, approve the button with the address ${TRACKED_LINK_BASE}{{1}} and pick “Checkout Recovery Link — button code”.`}
            </FieldDescription>
          )}
        </Field>
      )}
    </div>
  );
};

export default VariableMapping;
