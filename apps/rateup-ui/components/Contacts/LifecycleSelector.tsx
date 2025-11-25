"use client";

import React from "react";

import { Button, Select, SelectProps } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import SelectR from "react-select";

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

export const LifecycleInputs = ({
  label,
  value,
  onChange,
  placeholder = "Select lifecycle",
  size, // ignored for react-select but kept for compatibility
  width = 200,
  searchable = true,
  disabled = false,
  ...props
}: SelectProps) => {
  const tags = useLifecycleContext();

  // Grouped options for react-select: [{ label, options: [...] }]
  const options = React.useMemo(
    () => [
      {
        label: "Lifecycle Stages",
        options:
          tags
            ?.filter((label) => label?.category !== "lost")
            .map((label) => ({
              value: label?.id,
              label: `${label?.emoji} ${label?.name}`,
            })) || [],
      },
      {
        label: "Lost Stages",
        options:
          tags
            ?.filter((label) => label?.category === "lost")
            .map((label) => ({
              value: label?.id,
              label: `${label?.emoji} ${label?.name}`,
            })) || [],
      },
    ],
    [tags],
  );

  // Map string lifecycleId -> react-select option object
  const selectedOption = React.useMemo(() => {
    if (!value) return null;
    const flat = options.flatMap((g) => g.options);
    return flat.find((opt) => opt.value === value) || null;
  }, [value, options]);

  const handleChange = (opt: any) => {
    // opt can be null or { value, label }
    const val = opt?.value ?? "";
    // keep same API: string in, string out
    (onChange as any)?.(val);
  };

  const pixelWidth = typeof width === "number" ? `${width}px` : width || "100%";

  return (
    <div style={{ width: pixelWidth }}>
      {label && (
        <label className="mb-1 block text-sm font-medium">{label}</label>
      )}
      <SelectR
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isSearchable={searchable}
        isDisabled={disabled}
      />
    </div>
  );
};
