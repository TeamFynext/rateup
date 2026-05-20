"use client";

import React, { useEffect, useState } from "react";

import { Activity, Infinity } from "lucide-react";

import { useLifecycleContext } from "@/context/LifecycleContext.ts";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";

export const LifecycleSelector = ({
  value,
  onChange,
  placeholder,
  customTrigger,
  className = "",
  all = false,
  position = "bottom",
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
  position?: "top" | "bottom" | "left" | "right";
}) => {
  const tags = useLifecycleContext();
  const [selectedLifeCycle, setSelectedLifeCycle] = useState(null);

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

  const isLostCategory = React.useMemo(() => {
    const currentTag = tags?.find((tag) => tag.id === value);
    return currentTag?.category === "lost";
  }, [value, tags]);

  const handleSubmit = (newValue: string) => {
    if (newValue === value) return;
    const lifecycle = tags?.find((t) => t.id === newValue);
    const itemWithIcon = allItems?.find((i) => i.value === newValue);
    setSelectedLifeCycle(itemWithIcon);
    onChange(newValue, lifecycle);
  };

  const handleNextStage = () => {
    if (isLostCategory) return;

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
        <span className="text-foreground text-sm">
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
      <span className="text-foreground text-sm">
        {placeholder ?? "Select a lifecycle stage"}
      </span>
    );
  };

  if (all) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={`${className} flex items-center text-foreground justify-start gap-2 cursor-pointer`}
          >
            <Activity className="h-4 w-4 shrink-0 text-foreground" />
            <TriggerComponent />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent side={position} align="start">
          {allItems.map((lifecycle) => (
            <DropdownMenuItem
              key={lifecycle.value}
              onClick={() => handleSubmit(lifecycle.value)}
              className="cursor-pointer"
            >
              <lifecycle.icon />
              <span className="ml-1">{lifecycle.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={`${className} flex items-center justify-start text-foreground gap-2 cursor-pointer`}
        >
          <Activity className="h-4 w-4 shrink-0 text-foreground" />
          <TriggerComponent />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent side={position} align="start">
        {inboxLabels.map((group, index) => (
          <React.Fragment key={group.group}>
            <DropdownMenuLabel>{group.group}</DropdownMenuLabel>

            {group.items.map((label) => (
              <DropdownMenuItem
                key={label.value}
                onClick={() => handleSubmit(label.value)}
              >
                <label.icon />
                <span className="ml-1">{label.label}</span>
              </DropdownMenuItem>
            ))}

            {index !== inboxLabels.length - 1 && <DropdownMenuSeparator />}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
