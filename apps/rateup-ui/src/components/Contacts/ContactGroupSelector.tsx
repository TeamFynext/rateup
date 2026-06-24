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
    return (
      <MultiSelect
        onValueChange={onChange}
        options={groups?.map((group) => ({
          value: group.id,
          label: group.name,
        }))}
        className={`${className}`}
        placeholder="Select groups"
        defaultValue={value}
      />
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${className}`}>
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
