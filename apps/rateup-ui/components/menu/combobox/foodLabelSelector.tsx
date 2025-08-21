import { useState } from "react";

import {
  CheckIcon,
  Combobox,
  Flex,
  Group,
  Image,
  Pill,
  PillsInput,
  ScrollAreaAutosize,
  Text,
  useCombobox,
} from "@mantine/core";
import { useTranslations } from "next-intl";

import { menuLabelWithText } from "../util/menuLabelData";

export function FoodLabelSelector({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [search, setSearch] = useState("");
  const translations = useTranslations();
  const handleValueSelect = (val: string) => {
    form.setValues((prevValues) => {
      const updatedFoodLabels = prevValues?.foodLabels?.includes(val)
        ? prevValues?.foodLabels?.filter((v) => v !== val)
        : [...(prevValues?.foodLabels ?? []), val];
      return {
        ...prevValues,
        foodLabels: updatedFoodLabels,
      };
    });
  };
  const handleValueRemove = (val: string) =>
    form.setValues((prevValues) => ({
      ...prevValues,
      foodLabels: prevValues?.foodLabels?.filter((v: string) => v !== val),
    }));

  const values = form?.values?.foodLabels?.map((item) => (
    <Pill key={item} withRemoveButton onRemove={() => handleValueRemove(item)}>
      <Flex align={"center"} h={"100%"} columnGap={5}>
        <Image
          src={menuLabelWithText?.find((gr) => gr.label === item)?.image}
          alt="it's me"
          h={15}
          w={15}
        />
        {item}
      </Flex>
    </Pill>
  ));

  const options = menuLabelWithText
    .filter(({ image: item }) =>
      item.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .filter(({ label }) => !form?.values?.foodLabels?.includes(label))
    .map(({ image, label }) => (
      <Combobox.Option
        value={label}
        key={image}
        active={form?.values?.foodLabels?.includes(image)}
      >
        <Group gap="sm">
          {form?.values?.foodLabels?.includes(label) ? (
            <CheckIcon size={12} />
          ) : null}
          <Flex align={"center"} h={"100%"} columnGap={5}>
            <Image src={image} alt="it's me" h={15} w={15} />
            {label}
          </Flex>
        </Group>
      </Combobox.Option>
    ));

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.DropdownTarget>
        <PillsInput
          onClick={() => combobox.openDropdown()}
          radius={"12px"}
          label={
            <Text c={"var(--mantine-color-gray-7)"} fz={"xs"}>
              {translations("Allergen Info")}
            </Text>
          }
        >
          <Pill.Group mih={31}>
            {values}
            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder={translations("Search Values")}
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    event.preventDefault();
                    handleValueRemove(
                      form?.values?.foodLabels[
                        form?.values?.foodLabels.length - 1
                      ],
                    );
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <ScrollAreaAutosize mah={300}>
          <Combobox.Options>
            {options.length > 0 ? (
              options
            ) : (
              <Combobox.Empty>
                {translations("Nothing found...")}
              </Combobox.Empty>
            )}
          </Combobox.Options>
        </ScrollAreaAutosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}
