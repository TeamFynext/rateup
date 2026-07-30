import React from "react";

import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import { useLifecycleContext } from "@/context/LifecycleContext.ts";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";

const ALL_VALUE = "all";

const toLabel = (lifecycle: { name: string; emoji?: string }) =>
  lifecycle?.emoji ? `${lifecycle.emoji} ${lifecycle.name}` : lifecycle?.name;

export const LifecycleSelector = ({
  value,
  onChange,
  placeholder,
  className = "",
  all = false,
}: {
  value: string;
  onChange: (
    value: string,
    lifecycleObj: { id: string; name: string; emoji: string; category: string },
  ) => void;
  placeholder?: string;
  className?: string;
  all?: boolean;
}) => {
  const tags = useLifecycleContext();

  const groups = React.useMemo(
    () => [
      {
        group: "Lifecycle Stages",
        items:
          tags
            ?.filter((lifecycle: GetLabelsRes) => lifecycle?.category !== "lost")
            .map((lifecycle: GetLabelsRes) => ({
              value: lifecycle?.id,
              label: toLabel(lifecycle),
            })) || [],
      },
      {
        group: "Lost Stages",
        items:
          tags
            ?.filter((lifecycle: GetLabelsRes) => lifecycle?.category === "lost")
            .map((lifecycle: GetLabelsRes) => ({
              value: lifecycle?.id,
              label: toLabel(lifecycle),
            })) || [],
      },
    ],
    [tags],
  );

  const items = React.useMemo(() => {
    const flat = groups.flatMap((group) => group.items);
    return all ? [{ value: ALL_VALUE, label: "All Lifecycles" }, ...flat] : flat;
  }, [groups, all]);

  const handleChange = (newValue: string) => {
    if (newValue === value) return;
    onChange(
      newValue,
      tags?.find((lifecycle: GetLabelsRes) => lifecycle.id === newValue),
    );
  };

  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <Select value={value || null} onValueChange={handleChange} items={items}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder ?? "Select a lifecycle stage"} />
      </SelectTrigger>
      <SelectContent>
        {all && (
          <SelectGroup>
            <SelectItem value={ALL_VALUE}>All Lifecycles</SelectItem>
          </SelectGroup>
        )}
        {visibleGroups.map((group, index) => (
          <React.Fragment key={group.group}>
            {(all || index > 0) && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel>{group.group}</SelectLabel>
              {group.items.map((item: { value: string; label: string }) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
};
