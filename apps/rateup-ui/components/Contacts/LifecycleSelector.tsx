"use client";

import React from "react";

import { Button, Select, SelectProps } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
import { useLifecycleContext } from "@/context/LifecycleContext";

import { useEditContactLabelsMutation } from "../../backend/campaign/contacts/contacts.query";
import DropdownSelector from "../ui/custom/DropDownSelector";

export const LifecycleSelector = ({
  value,
  id,
}: {
  value: string;
  id: string;
}) => {
  const tags = useLifecycleContext();
  const { updateContactById } = useContactsStore();
  const editContactMutation = useEditContactLabelsMutation(id);

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
              icon: () => (
                <span role="img" className="text-[10px]">
                  {label?.emoji}
                </span>
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
              icon: () => (
                <span role="img" className="text-[10px]">
                  {label?.emoji}
                </span>
              ),
            })) || [],
      },
    ],
    [tags],
  );

  // Flatten all items for easier navigation
  const allItems = React.useMemo(
    () => [...inboxLabels[0].items, ...inboxLabels[1].items],
    [inboxLabels],
  );

  // Check if current item is in lost category
  const isLostCategory = React.useMemo(() => {
    const currentTag = tags?.find((tag) => tag.id === value);
    return currentTag?.category === "lost";
  }, [value, tags]);

  const handleSubmit = (newValue: string) => {
    if (newValue === value) return; // Prevent unnecessary updates
    editContactMutation.mutate(
      {
        data: { lifecycleId: newValue },
        contactId: id,
      },
      {
        onSuccess: () => {
          updateContactById(id, (contact) => ({
            ...contact,
            lifecycleId: newValue,
            lifecycleName: inboxLabels
              .flatMap((c) => c.items)
              .find((c) => c.value === newValue).label,
          }));
        },
      },
    );
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

  return (
    <DropdownSelector
      value={value}
      data={inboxLabels}
      onChange={handleSubmit}
    />
  );
};

export const LifecycleInput = ({
  label,
  value,
  onChange,
  placeholder = "Select lifecycle",
  size = "sm",
  width = 200,
  searchable = true,
  disabled = false,
  ...props
}: SelectProps) => {
  const tags = useLifecycleContext();

  // Memoize the labels to prevent unnecessary recalculations
  const lifecycleLabels = React.useMemo(
    () => [
      {
        group: "Lifecycle Stages",
        items:
          tags
            ?.filter((label) => label?.category !== "lost")
            .map((label) => ({
              value: label?.id,
              label: label?.emoji + " " + label?.name,
            })) || [],
      },
      {
        group: "Lost Stages",
        items:
          tags
            ?.filter((label) => label?.category === "lost")
            .map((label) => ({
              value: label?.id,
              label: label?.emoji + " " + label?.name,
            })) || [],
      },
    ],
    [tags],
  );

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={lifecycleLabels}
      value={value}
      onChange={onChange}
      size={size}
      searchable={searchable}
      w={width}
      disabled={disabled}
      aria-label="Lifecycle stage"
      comboboxProps={{ withArrow: true }}
    />
  );
};
