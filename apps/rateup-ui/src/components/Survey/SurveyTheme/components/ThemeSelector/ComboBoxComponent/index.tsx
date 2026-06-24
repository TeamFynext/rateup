import { Combobox, Input, InputBase, Loader, ScrollArea, useCombobox } from "@mantine/core";

import RenderOption from "../RenderOption.tsx";

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
      classNames={{
        dropdown: `${styles["dropdown"]}`,
        ...classNames,
      }}
      store={combobox}
      resetSelectionOnOptionHover
      withinPortal={false}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
      zIndex={200}
    >
      <Combobox.Target targetType="button">
        <InputBase
          label={"Select Theme: "}
          component="button"
          type="button"
          pointer
          rightSection={isLoading ? <Loader size={"1rem"} /> : <Combobox.Chevron />}
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

      <Combobox.Dropdown miw={300}>
        <Combobox.Options className={styles["combobox-options-div"]}>
          <ScrollArea.Autosize
            scrollbarSize={"0.4375rem"}
            className={styles["scroll-area-div"]}
            type="hover"
            classNames={{
              viewport: styles["options-scroll-area-viewport"],
            }}
            scrollbars={"y"}
          >
            {options}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default ComboBoxComponent;
