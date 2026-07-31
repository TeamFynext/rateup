import { IconLoader2 } from "@tabler/icons-react";
import { useId, useMemo } from "react";

import { useCustomFields } from "@/backend/campaign/contacts/contacts.query";
import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";

import { Field, FieldLabel } from "../ui/field.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { contactVariablePresets, shopifyVariablePresets } from "./shopifyVariables.ts";

interface VariableMappingProps {
  waTemplateId: string;
  value: { templateParamIndex: number; shopifyPath: string }[];
  onChange: (value: { templateParamIndex: number; shopifyPath: string }[]) => void;
  triggerEvent?: string;
}

const VariableMapping = ({ waTemplateId, value, onChange, triggerEvent }: VariableMappingProps) => {
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

  if (variables.length === 0) {
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
    </div>
  );
};

export default VariableMapping;
