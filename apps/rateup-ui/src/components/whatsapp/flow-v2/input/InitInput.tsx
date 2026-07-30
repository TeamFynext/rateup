import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import type { FlowInputProps } from "./inputProps.ts";

const InitInput = (
  props: FlowInputProps<string> & { dataSource?: Array<{ id: string; title: string }> },
) => {
  const uid = useId();
  const options =
    props?.dataSource?.map((data: { id: string; title: string }) => ({
      value: data.id,
      label: data.title,
    })) ?? [];

  return options.length > 0 ? (
    <Field>
      <FieldLabel htmlFor={`${uid}-field`}>{props.label}</FieldLabel>
      <Select
        items={options}
        value={props.value ?? ""}
        onValueChange={(value) => props.onChange?.(value ?? "")}
      >
        <SelectTrigger id={`${uid}-field`} className="w-full">
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option: { value: string; label: string }) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  ) : (
    <Field>
      <FieldLabel htmlFor={`${uid}-field-2`}>{props.label}</FieldLabel>
      <Input
        id={`${uid}-field-2`}
        onChange={(e) => props.onChange?.(e.target.value)}
        placeholder={props.placeholder}
      />
    </Field>
  );
};

export default InitInput;
