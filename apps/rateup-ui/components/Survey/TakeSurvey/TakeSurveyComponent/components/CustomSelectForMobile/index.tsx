import { useEffect, useRef, useState } from "react";
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
  useMantineTheme,
} from "@mantine/core";
import classNames from "classnames/bind";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import styles from "./CustomSelectForMobile.module.css";
import { motion, useAnimate } from "framer-motion";

const cx = classNames.bind(styles);

function CustomSelectForMobile({ value, data, placeholder, onChange }) {
  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor[5];

  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] =
    useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });

  const [scope, animate] = useAnimate();

  const optionsMotionDivRefs = useRef(null);

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => {
      const styleObj =
        item === value
          ? { backgroundColor: themePrimaryColor, color: "#FFFFFF" }
          : { backgroundColor: "#FFFFFF", color: "#000000" };
      return (
        <Combobox.Option
          value={item}
          key={item}
          className={cx("option", { selected: item === value })}
          data-value={item}
        >
          <motion.div
            className={cx("option-text-checked-icon-container")}
            style={styleObj}
            ref={(node) => {
              const map = getOptionsMotionDivsMap();
              if (node) {
                map.set(item, node);
              } else {
                map.delete(item);
              }
            }}
          >
            <span className={cx("option-text-span")}>{item}</span>
            {item === value && (
              <span className={cx("checked-icon-span")}>
                <IconCheck size={"1rem"} />
              </span>
            )}
          </motion.div>
        </Combobox.Option>
      );
    });

  function getOptionsMotionDivsMap() {
    if (!optionsMotionDivRefs.current) {
      optionsMotionDivRefs.current = new Map();
    }
    return optionsMotionDivRefs.current;
  }

  useEffect(() => {
    setSearch("");
  }, [isOptionSelectionDivVisible]);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={async (val) => {
        const selectedEle = getOptionsMotionDivsMap().get(val);
        const prevSelectedEle = getOptionsMotionDivsMap().get(value);
        onChange(val);

        if (prevSelectedEle)
          animate(
            prevSelectedEle,
            { backgroundColor: "#FFFFFF", color: "#000000" },
            { duration: 0.2 },
          );

        if (value !== val) {
          await animate(
            selectedEle,
            { backgroundColor: themePrimaryColor, color: "#FFFFFF" },
            { duration: 0.5 },
          );
        }

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
            <Combobox.Options
              ref={scope}
              className={cx("options-container-root")}
            >
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
