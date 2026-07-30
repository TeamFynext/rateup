import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";

import { Card } from "../ui/card.tsx";
import { MultiSelect } from "../ui/multi-select.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

/**
 * `allowMultiSelect` decides whether this renders a `MultiSelect` or a `Select`,
 * and with it whether the value is a list of group ids or a single one.
 */
type ContactGroupSelectorProps =
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

const ContactGroupSelector = (props: ContactGroupSelectorProps) => {
  const { isLoading } = useContactGroup();
  if (isLoading) {
    return (
      <Card className="w-full p-1">
        <Skeleton className="w-full" />
      </Card>
    );
  }
  if (props.allowMultiSelect) {
    return (
      <MultiGroupSelect
        value={props.value}
        onChange={props.onChange}
        className={props.className ?? ""}
      />
    );
  }
  // `allowMultiSelect` is optional in the single-select member, so the negative
  // branch is spelled out rather than narrowed off the flag.
  const { value, onChange, className } = props as Extract<
    ContactGroupSelectorProps,
    { allowMultiSelect?: false }
  >;
  return <SingleGroupSelect value={value} onChange={onChange} className={className ?? ""} />;
};

function MultiGroupSelect({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  className: string;
}) {
  const { data: groups } = useContactGroup();
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

function SingleGroupSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const { data: groups } = useContactGroup();
  const groupItems = groups?.map((g) => ({ value: g.id, label: g.name })) ?? [];
  return (
    <Select value={value} onValueChange={(value) => onChange(value ?? "")} items={groupItems}>
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
}

export default ContactGroupSelector;
