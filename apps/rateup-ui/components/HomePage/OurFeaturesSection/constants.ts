import { ComboboxStore } from "@mantine/core";

export const tabs = [
  { index: 0, value: "surveys", label: "Surveys" },
  { index: 1, value: "reputation-management", label: "Reputation Management" },
  { index: 2, value: "loyalty", label: "Loyalty" },
];

export const onTabOrComboBoxChange = (
  setActiveTab: (newValue: object) => void,
  combobox?: ComboboxStore,
) => {
  return (value: string) => {
    const tabsIndex = tabs.findIndex((tabObj) => tabObj.value === value);
    setActiveTab(tabs[tabsIndex]);
    if (combobox) {
      combobox.closeDropdown();
      combobox.updateSelectedOptionIndex("active");
    }
  };
};
