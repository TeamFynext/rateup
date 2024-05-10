import { useEffect, useState } from "react";
import {
  ActionIcon,
  Combobox,
  Group,
  Input,
  InputBase,
  Portal,
  ScrollAreaAutosize,
  Stack,
  useCombobox,
} from "@mantine/core";
import classNames from "classnames/bind";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import styles from "./CustomSelectForMobile.module.css";

const cx = classNames.bind(styles);

function CustomSelectForMobile({ value, data, placeholder, onChange }) {
  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] =
    useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option
        value={item}
        key={item}
        className={cx("option", { selected: item === value })}
      >
        <span className={cx("option-text-span")}>{item}</span>
        {item === value && (
          <span className={cx("checked-icon-span")}>
            <IconCheck size={"1rem"} />
          </span>
        )}
      </Combobox.Option>
    ));

  useEffect(() => {
    setSearch("");
  }, [isOptionSelectionDivVisible]);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        setIsOptionSelectionDivVisible(false);
      }}
    >
      <Combobox.EventsTarget>
        <InputBase
          className={cx("input-btn")}
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => setIsOptionSelectionDivVisible(true)}
          rightSectionPointerEvents="none"
        >
          {value || (
            <Input.Placeholder>{placeholder || "Pick value"}</Input.Placeholder>
          )}
        </InputBase>
      </Combobox.EventsTarget>

      {isOptionSelectionDivVisible && (
        <Portal>
          <Stack className={cx("search-input-and-options-container")}>
            <Group className={cx("back-btn-and-search-input-container")}>
              <ActionIcon
                variant="transparent"
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                <IconArrowLeft />
              </ActionIcon>
              <Combobox.Search
                className={cx("search-input")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Type in to search"
              />
            </Group>
            <Combobox.Options className={cx("options-container-root")}>
              <ScrollAreaAutosize h={"100%"} scrollbarSize={7} offsetScrollbars>
                <Stack className={cx("options-container-div")}>
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

export default CustomSelectForMobile;
