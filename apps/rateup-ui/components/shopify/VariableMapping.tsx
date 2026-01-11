"use client";

import React, { useMemo } from "react";

import { Loader2 } from "lucide-react";

import { useWaTemplateById } from "@/backend/whatsapp/whatsapp.query";

import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { shopifyVariablePresets } from "./shopifyVariables";

interface VariableMappingProps {
  waTemplateId: string;
  value: { templateParamIndex: number; shopifyPath: string }[];
  onChange: (
    value: { templateParamIndex: number; shopifyPath: string }[],
  ) => void;
}

const VariableMapping = ({
  waTemplateId,
  value,
  onChange,
}: VariableMappingProps) => {
  const { data: template, isLoading } = useWaTemplateById(waTemplateId);

  const variables = useMemo(() => {
    if (!template?.data?.components) return [];
    const bodyComponent = template.data.components.find(
      (c: any) => c.type === "BODY" || c.type === "body",
    );
    // WhatsApp templates use example.body_text[0] to store examples for parameters {{1}}, {{2}}...
    const bodyExamples = bodyComponent?.example?.body_text?.[0] || [];
    return bodyExamples as string[];
  }, [template]);

  const handleMappingChange = (index: number, shopifyPath: string) => {
    const newValue = [...value];
    const existingIndex = newValue.findIndex(
      (m) => m.templateParamIndex === index,
    );
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
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">
          Loading template variables...
        </span>
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
          Map your WhatsApp template variables to Shopify data.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {variables.map((example, i) => {
          const currentMapping = value.find((m) => m.templateParamIndex === i);
          return (
            <div key={i} className="space-y-2">
              <Label className="text-xs">
                Variable {"{{"}
                {i + 1}
                {"}}"} (e.g. {example})
              </Label>
              <Select
                value={currentMapping?.shopifyPath || ""}
                onValueChange={(val) => handleMappingChange(i, val)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Shopify Field" />
                </SelectTrigger>
                <SelectContent>
                  {shopifyVariablePresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariableMapping;
