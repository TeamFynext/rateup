import { useContactLabels } from "@/backend/campaign/contacts/contacts.query";

import { Card } from "../ui/card.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

const LabelSelector = ({ value, onChange, className = "", allowMultiSelect = false }) => {
  const { data: labels = [], isLoading } = useContactLabels();
  if (isLoading) {
    return (
      <Card className="w-full p-1">
        <Skeleton className="w-full" />
      </Card>
    );
  }
  if (allowMultiSelect) {
    const labelOptions = labels?.map((label) => ({ value: label.id, label: label.name })) ?? [];
    return (
      <MultiSelect
        options={labelOptions}
        value={value}
        onValueChange={onChange}
        placeholder="Select labels"
        emptyIndicator="No labels found."
        className={`${className}`}
      />
    );
  }
  const labelItems = labels?.map((label) => ({ value: label.id, label: label.name })) ?? [];
  return (
    <Select value={value} onValueChange={onChange} items={labelItems}>
      <SelectTrigger className={`${className}`}>
        <SelectValue placeholder={"Select a label"} />
      </SelectTrigger>
      <SelectContent>
        {labels?.map((label) => (
          <SelectItem value={label.id} key={label.id}>
            {label.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LabelSelector;
