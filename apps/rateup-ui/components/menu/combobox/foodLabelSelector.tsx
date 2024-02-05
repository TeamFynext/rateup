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
import { useEffect, useState } from "react";
import { menuLabelWithText } from "../util/menuLabelData";

export function FoodLabelSelector({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [search, setSearch] = useState("");
  const [value, setValue] = useState<string[]>([]);

  const handleValueSelect = (val: string) => {
    setValue((current) =>
      current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val],
    );
  };
  useEffect(() => {
    if (value) form?.setFieldValue("foodLabels", value);
  }, [value]);

  useEffect(() => {
    if (form?.values?.foodLabels) setValue(form?.values?.foodLabels);
  }, []);

  const handleValueRemove = (val: string) =>
    setValue((current) => current.filter((v) => v !== val));

  const values = value.map((item) => (
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
    .filter(({ label }) => !value.includes(label))
    .map(({ image, label }) => (
      <Combobox.Option value={label} key={image} active={value.includes(image)}>
        <Group gap="sm">
          {value.includes(label) ? <CheckIcon size={12} /> : null}
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
              Allergen Info
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
                placeholder="Search Values"
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    event.preventDefault();
                    handleValueRemove(value[value.length - 1]);
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
              <Combobox.Empty>Nothing found...</Combobox.Empty>
            )}
          </Combobox.Options>
        </ScrollAreaAutosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}
