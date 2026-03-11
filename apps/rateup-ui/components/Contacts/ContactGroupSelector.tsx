import { useEffect, useState } from "react";

import { Folder } from "lucide-react";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";

import { Card } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MultiSelect } from "../ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";

const ContactGroupSelector = ({
  value,
  onChange,
  className = "",
  allowMultiSelect = false,
}) => {
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

export const ContactGroupsSelector = ({
  contactId,
  value = [],
  onChange,
  className = "",
  contactgroups,
  contactGroupsLoading,
}) => {
  const { data: groups, isLoading: groupsLoading } = useContactGroup();

  const [selectedIds, setSelectedIds] = useState<string[]>(value);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && contactgroups) {
      const existingIds = contactgroups.map((g) => g.id);
      setSelectedIds(existingIds);
      setInitialized(true);
    }
  }, [contactgroups, initialized]);

  const toggleGroup = (groupId: string) => {
    const prev = selectedIds;

    const next = prev.includes(groupId)
      ? prev.filter((id) => id !== groupId)
      : [...prev, groupId];

    const addGroupIds = next.filter((id) => !prev.includes(id));
    const removeGroupIds = prev.filter((id) => !next.includes(id));

    setSelectedIds(next);

    onChange({
      nextIds: next,
      addGroupIds,
      removeGroupIds,
    });
  };

  const selectedCount = selectedIds.length;

  if (groupsLoading || contactGroupsLoading) {
    return (
      <div className="w-40">
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`border-none text-sm font-medium flex items-center text-foreground justify-start cursor-pointer gap-2 ${className}`}
      >
        <Folder className="h-4 w-4 shrink-0 text-foreground" />

        {selectedCount
          ? `${selectedCount} Group${selectedCount > 1 ? "s" : ""}`
          : "Groups"}
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="start" className="w-48">
        {groups?.length ? (
          groups.map((group) => {
            const active = selectedIds.includes(group.id);

            return (
              <div
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className={`flex items-center px-2 py-1.5 cursor-pointer rounded-sm ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <span className="text-sm flex-1">{group.name}</span>
                {active && <span className="text-xs">✓</span>}
              </div>
            );
          })
        ) : (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            No groups found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
