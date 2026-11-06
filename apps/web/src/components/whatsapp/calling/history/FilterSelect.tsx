import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";

/** A compact single-choice filter for the Calls page toolbar. */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Read out for the trigger; the selected option is what shows. */
  label: string;
}>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next ?? options[0]?.value ?? "")}
      items={options}
    >
      <SelectTrigger className="h-8 w-full sm:w-44" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
