import { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  Combobox,
  ComboboxChevron,
  Group,
  Input,
  Pill,
  PillsInput,
  Portal,
  ScrollAreaAutosize,
  Stack,
  useCombobox,
} from "@mantine/core";
import classNames from "classnames/bind";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import commonStyles from "../CustomSelectForMobile/CustomSelectForMobile.module.css";
import styles from "./CustomMultiselectForMobile.module.css";

const cxCommon = classNames.bind(commonStyles);
const cx = classNames.bind(styles);

function CustomMultiselectForMobile({ value, data, onChange, placeholder }) {
  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] =
    useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });

  const handleValueSelect = (val) => {
    const newValuesArr = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];

    onChange(newValuesArr);
  };

  const handleValueRemove = (val) => {
    const newValuesArr = value.filter((v) => v !== val);
    onChange(newValuesArr);
  };

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option
        value={item}
        key={item}
        className={cxCommon("option", { selected: value.includes(item) })}
      >
        <span className={cxCommon("option-text-span")}>{item}</span>
        {value.includes(item) && (
          <span className={cxCommon("checked-icon-span")}>
            <IconCheck size={"1rem"} />
          </span>
        )}
      </Combobox.Option>
    ));

  const values = value.map((item) => (
    <Pill key={item} withRemoveButton onRemove={() => handleValueRemove(item)}>
      {item}
    </Pill>
  ));

  useEffect(() => {
    setSearch("");
  }, [isOptionSelectionDivVisible]);

  return (
    <Combobox store={combobox} onOptionSubmit={handleValueSelect}>
      <Combobox.EventsTarget>
        <PillsInput
          pointer
          onClick={() => setIsOptionSelectionDivVisible(true)}
          className={cx("pills-input")}
        >
          <Pill.Group className={cx("pills-group")}>
            {values.length > 0 && values}
            <Input.Placeholder>
              {placeholder || "Pick values"}
            </Input.Placeholder>
          </Pill.Group>
          <ComboboxChevron />
        </PillsInput>
      </Combobox.EventsTarget>

      {isOptionSelectionDivVisible && (
        <Portal>
          <Stack className={cxCommon("search-input-and-options-container")}>
            <Group className={cxCommon("back-btn-and-search-input-container")}>
              <ActionIcon
                variant="transparent"
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                <IconArrowLeft />
              </ActionIcon>
              <Combobox.Search
                className={cxCommon("search-input")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Type in to search"
              />
            </Group>
            <Button
              className={cx("deselect-all-btn")}
              onClick={() => onChange([])}
            >
              Deselect all
            </Button>
            <Combobox.Options className={cxCommon("options-container-root")}>
              <ScrollAreaAutosize h={"100%"} scrollbarSize={7} offsetScrollbars>
                <Stack className={cxCommon("options-container-div")}>
                  {options.length > 0 ? (
                    options
                  ) : (
                    <Combobox.Empty>Nothing found</Combobox.Empty>
                  )}
                </Stack>
              </ScrollAreaAutosize>
            </Combobox.Options>
          </Stack>
        </Portal>
      )}
    </Combobox>
  );
}

export default CustomMultiselectForMobile;
