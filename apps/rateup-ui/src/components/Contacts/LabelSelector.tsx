import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";

import { Card } from "../ui/card.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

/** A contact label as the label picker renders it. */
interface ContactLabelOption {
  id: string;
  name: string;
  color?: string;
}

/**
 * `allowMultiSelect` decides whether this renders a `MultiSelect` or a `Select`,
 * and with it whether the value is a list of label ids or a single one.
 */
type LabelSelectorProps =
  | {
      allowMultiSelect: true;
      value: string[];
      onChange: (value: string[]) => void;
      className?: string;
    }
  | {
      allowMultiSelect?: false;
      value: string;
      onChange: (value: string) => void;
      className?: string;
    };

const LabelSelector = (props: LabelSelectorProps) => {
  // `allowMultiSelect` is optional in the single-select member, so the branches
  // read their own value/onChange rather than narrowing off the flag.
  const { className = "" } = props;
  const { data: labels = [], isLoading } = useContactLabels();
  if (isLoading) {
    return (
      <Card className="w-full p-1">
        <Skeleton className="w-full" />
      </Card>
    );
  }
  if (props.allowMultiSelect) {
    const labelOptions =
      labels?.map((label: ContactLabelOption) => ({ value: label.id, label: label.name })) ?? [];
    return (
      <MultiSelect
        options={labelOptions}
        value={props.value}
        onValueChange={props.onChange}
        placeholder="Select labels"
        emptyIndicator="No labels found."
        className={`${className}`}
      />
    );
  }
  const labelItems =
    labels?.map((label: ContactLabelOption) => ({ value: label.id, label: label.name })) ?? [];
  const { value, onChange } = props as Extract<LabelSelectorProps, { allowMultiSelect?: false }>;
  return (
    <Select value={value} onValueChange={onChange} items={labelItems}>
      <SelectTrigger className={`${className}`}>
        <SelectValue placeholder={"Select a label"} />
      </SelectTrigger>
      <SelectContent>
        {labels?.map((label: ContactLabelOption) => (
          <SelectItem value={label.id} key={label.id}>
            {label.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LabelSelector;
