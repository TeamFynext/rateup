import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const InitInput = (props) => {
  const options = props?.dataSource?.map((data) => ({ value: data.id, label: data.title })) ?? [];

  return options.length > 0 ? (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <Select items={options} value={props.value ?? ""} onValueChange={props.onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  ) : (
    <Field>
      <FieldLabel>{props.label}</FieldLabel>
      <Input onChange={props.onChange} placeholder={props.placeholder} />
    </Field>
  );
};

export default InitInput;
