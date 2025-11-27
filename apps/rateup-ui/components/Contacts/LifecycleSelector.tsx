"use client";

import React, { useEffect, useState } from "react";

import { Infinity } from "lucide-react";

import { useLifecycleContext } from "@/context/LifecycleContext";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export const LifecycleSelector = ({
  value,
  onChange,
  placeholder,
  customTrigger,
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
  customTrigger?: React.ReactNode;
  all?: boolean;
}) => {
  const tags = useLifecycleContext();
  const [selectedLifeCycle, setSelectedLifeCycle] = useState(null);

  // Memoize the labels to prevent unnecessary recalculations
  const inboxLabels = React.useMemo(
    () => [
      {
        group: "Lifecycle Stages",
        items:
          tags
            ?.filter((label) => label?.category !== "lost")
            .map((label) => ({
              value: label?.id,
              label: label?.name,
              icon: ({ className }) => (
                <div
                  className={`w-5 h-5 p-2 rounded-full bg-blue-50 flex items-center justify-center ${className}`}
                >
                  <span role="img" className="text-[12px]">
                    {label?.emoji}
                  </span>
                </div>
              ),
            })) || [],
      },
      {
        group: "Lost Stages",
        items:
          tags
            ?.filter((label) => label?.category === "lost")
            .map((label) => ({
              value: label?.id,
              label: label?.name,
              icon: ({ className }) => (
                <div
                  className={`w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center ${className}`}
                >
                  <span role="img" className="text-[15px]">
                    {label?.emoji}
                  </span>
                </div>
              ),
            })) || [],
      },
    ],
    [tags],
  );

  useEffect(() => {
    const itemWithIcon = allItems?.find((i) => i.value === value);
    setSelectedLifeCycle(itemWithIcon);
  }, [value]);
  // Flatten all items for easier navigation
  const allItems = React.useMemo(
    () => [...inboxLabels[0].items, ...inboxLabels[1].items],
    [inboxLabels],
  );
  if (all && !allItems.find((i) => i.value === "all")) {
    allItems.unshift({
      value: "all",
      label: "All Lifecycles",
      icon: ({ className }) => (
        <div
          className={`w-5 h-5 p-1 rounded-full bg-blue-50 flex items-center justify-center ${className}`}
        >
          <span role="img" className="text-[15px]">
            <Infinity className="w-3 h-3" />
          </span>
        </div>
      ),
    });
  }

  // Check if current item is in lost category
  const isLostCategory = React.useMemo(() => {
    const currentTag = tags?.find((tag) => tag.id === value);
    return currentTag?.category === "lost";
  }, [value, tags]);

  const handleSubmit = (newValue: string) => {
    if (newValue === value) return; // Prevent unnecessary updates
    const lifecycle = tags?.find((t) => t.id === newValue);
    const itemWithIcon = allItems?.find((i) => i.value === newValue);
    setSelectedLifeCycle(itemWithIcon);
    onChange(newValue, lifecycle);
  };

  const handleNextStage = () => {
    if (isLostCategory) return; // Don't proceed if already in lost category

    const currentIndex = allItems.findIndex((item) => item.value === value);
    const nextIndex = (currentIndex + 1) % allItems.length;
    const nextItem = allItems[nextIndex];

    if (nextItem) {
      handleSubmit(nextItem.value);
    }
  };
  const TriggerComponent = () => {
    if (customTrigger) {
      if (value) return customTrigger;
      return (
        <span className="text-muted-foreground text-sm">
          {placeholder ?? "Select a lifecycle stage"}
        </span>
      );
    }
    if (selectedLifeCycle) {
      return (
        <div className="flex gap-2">
          <selectedLifeCycle.icon />
          <span className="text-sm">{selectedLifeCycle.label}</span>
        </div>
      );
    }
    return (
      <span className="text-muted-foreground text-sm">
        {placeholder ?? "Select a lifecycle stage"}
      </span>
    );
  };

  if (all) {
    return (
      <Select value={value} onValueChange={handleSubmit} defaultValue={"all"}>
        <SelectTrigger className={className}>
          <TriggerComponent />
        </SelectTrigger>
        <SelectContent>
          {allItems.map((lifecycle) => (
            <SelectItem
              value={lifecycle.value}
              key={lifecycle.value}
              className={`data-[highlighted]:text-blue-500 cursor-pointer ${className}`}
            >
              <lifecycle.icon />
              <span className="ml-1">{lifecycle.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Select value={value} onValueChange={handleSubmit}>
      <SelectTrigger className={className}>
        <TriggerComponent />
      </SelectTrigger>
      <SelectContent>
        {inboxLabels.map((group) => (
          <SelectGroup key={group.group}>
            <SelectLabel>{group.group}</SelectLabel>
            {group.items.map((label) => (
              <SelectItem value={label.value} key={label.value}>
                <label.icon />
                <span className="ml-1">{label.label}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
