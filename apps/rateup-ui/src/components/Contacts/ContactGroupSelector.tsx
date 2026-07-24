import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";

import { Card } from "../ui/card.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

const ContactGroupSelector = ({ value, onChange, className = "", allowMultiSelect = false }) => {
  const { data: groups, isLoading } = useContactGroup();
  if (isLoading) {
    return (
      <Card className="w-full p-1">
        <Skeleton className="w-full" />
      </Card>
    );
  }
  if (allowMultiSelect) {
    const groupOptions = groups?.map((group) => ({ value: group.id, label: group.name })) ?? [];
    return (
      <MultiSelect
        options={groupOptions}
        value={value}
        onValueChange={onChange}
        placeholder="Select groups"
        emptyIndicator="No groups found."
        className={`${className}`}
      />
    );
  }
  const groupItems = groups?.map((g) => ({ value: g.id, label: g.name })) ?? [];
  return (
    <Select value={value} onValueChange={onChange} items={groupItems}>
      <SelectTrigger aria-label="Select a group" className={`${className}`}>
        <SelectValue placeholder={"Select a group"} />
      </SelectTrigger>
      <SelectContent>
        {groups?.map((g) => (
          <SelectItem value={g.id} key={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ContactGroupSelector;
