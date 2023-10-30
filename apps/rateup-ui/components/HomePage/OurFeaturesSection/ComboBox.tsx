import { Input, InputBase, Combobox, useCombobox } from "@mantine/core";
import { tabs, onTabOrComboBoxChange } from "./constants";
import styles from "./OurFeaturesSection.module.css";

function ComboBox({ setActiveTab, activeTab }) {
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

  const options = tabs.map(({ value, index, label }) => {
    return (
      <Combobox.Option
        value={value}
        key={index}
        active={value === activeTab.value}
      >
        {label}
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={onTabOrComboBoxChange(setActiveTab, combobox)}
      classNames={styles}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          pointer
          rightSection={<Combobox.Chevron className={styles["chevron"]} />}
          onClick={() => combobox.toggleDropdown()}
          classNames={styles}
        >
          {activeTab.label || <Input.Placeholder>Pick value</Input.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default ComboBox;
