import { useState } from "react";
import {
  CheckIcon,
  Combobox,
  Group,
  Input,
  InputBase,
  Loader,
  useCombobox,
} from "@mantine/core";
import RenderOption from "../RenderOption";
import styles from "./ComboBoxComponent.module.css";

function ComboBoxComponent({
  className = "",
  classNames = {},
  value,
  data = [],
  onChange,
  renderOptionProps = {},
  isLoading = false,
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: (eventSource) => {
      if (eventSource === "keyboard") {
        combobox.selectActiveOption();
      } else {
        combobox.updateSelectedOptionIndex("active");
      }
    },
  });

  const selectedOption = data.find((obj) => {
    return obj.value === value;
  });

  const options = data.map((optionObj) => {
    return (
      <Combobox.Option
        value={optionObj.value}
        key={optionObj.value}
        active={optionObj.value === value}
      >
        {/* @ts-ignore */}
        <RenderOption option={optionObj} {...renderOptionProps} />
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      classNames={classNames}
      store={combobox}
      resetSelectionOnOptionHover
      withinPortal={false}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target targetType="button">
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={
            isLoading ? <Loader size={"1rem"} /> : <Combobox.Chevron />
          }
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          className={`${styles["combobox-input-base-root"]} ${className}`}
        >
          {selectedOption ? (
            selectedOption.label
          ) : (
            <Input.Placeholder>Pick value</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default ComboBoxComponent;
