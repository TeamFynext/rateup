"use client";

import React from "react";

import { Button, Select, SelectProps } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";

import useContactStore, { useContactsStore } from "@/app/dashboard/inbox/store";
import { useLabelsContext } from "@/context/LabelsContext";

import { useEditContactLabelsMutation } from "../../backend/campaign/contacts/contacts.query";

export const LifecycleSelector = ({
  value,
  id,
}: {
  value: string;
  id: string;
}) => {
  const tags = useLabelsContext();
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
    updateContactById(id, (contact) => ({
      ...contact,
      lifecycleId: newValue,
      lifecycleName: inboxLabels
        .flatMap((c) => c.items)
        .find((c) => c.value === newValue).label,
    }));
    editContactMutation.mutate({
      data: { lifecycleId: newValue },
      contactId: id,
    });
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
    <Button.Group>
      <Select
        placeholder="Select lifecycle"
        data={inboxLabels}
        value={value}
        onChange={handleSubmit}
        size="xs"
        searchable
        w={115}
        radius={0}
        aria-label="Lifecycle stage"
        comboboxProps={{ width: 150, withArrow: true }}
      />
      <Button
        variant="default"
        size="compact-md"
        onClick={handleNextStage}
        aria-label="Next lifecycle stage"
        title={
          isLostCategory
            ? "Cannot advance from lost stage"
            : "Move to next stage"
        }
        disabled={isLostCategory}
      >
        <IconChevronRight size="1rem" />
      </Button>
    </Button.Group>
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
  const tags = useLabelsContext();

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
