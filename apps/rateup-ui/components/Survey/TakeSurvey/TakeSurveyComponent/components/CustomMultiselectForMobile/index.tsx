import { useEffect, useRef, useState } from "react";
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
  isLightColor,
  luminance,
  useCombobox,
  useMantineTheme,
} from "@mantine/core";
import classNames from "classnames/bind";
import { IconArrowLeft, IconCheck, IconDeselect } from "@tabler/icons-react";
import { motion, useAnimate } from "framer-motion";
import commonStyles from "../CustomSelectForMobile/CustomSelectForMobile.module.css";
import styles from "./CustomMultiselectForMobile.module.css";

const cxCommon = classNames.bind(commonStyles);
const cx = classNames.bind(styles);

function CustomMultiselectForMobile({
  value,
  data,
  onChange,
  placeholder,
  portalProps = {},
}) {
  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const primaryColor =
    luminance(themePrimaryColor) > 0.8
      ? `var(--mantine-color-gray-7)`
      : themePrimaryColor;
  const pillTextColor = isLightColor(primaryColor) ? "#000000" : "#FFFFFF";

  const [scope, animate] = useAnimate();
  const optionsMotionDivRefs = useRef(null);

  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] =
    useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });

  const handleValueSelect = async (val) => {
    const valuesArr = value;
    const newValuesArr = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];

    onChange(newValuesArr);

    const domEle = getOptionsMotionDivsMap().get(val);

    if (valuesArr.includes(val)) {
      if (domEle)
        animate(
          domEle,
          { backgroundColor: "#FFFFFF", color: "#000000" },
          { duration: 0.2 },
        );
    }

    if (!valuesArr.includes(val)) {
      if (domEle) {
        await animate(
          domEle,
          { backgroundColor: primaryColor, color: "#FFFFFF" },
          { duration: 0.5 },
        );
      }
    }
  };

  const handleValueRemove = (val) => {
    const newValuesArr = value.filter((v) => v !== val);
    onChange(newValuesArr);
  };

  const handleDeselectAll = () => {
    value.forEach((val) => {
      const domEle = getOptionsMotionDivsMap().get(val);
      if (domEle)
        animate(
          domEle,
          { backgroundColor: "#FFFFFF", color: "#000000" },
          { duration: 0.2 },
        );
    });
    onChange([]);
  };

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => {
      const isSelectedItem = value.includes(item);
      const styleObj = isSelectedItem
        ? { backgroundColor: primaryColor, color: "#FFFFFF" }
        : { backgroundColor: "#FFFFFF", color: "#000000" };
      return (
        <Combobox.Option
          value={item}
          key={item}
          className={cxCommon("option", { selected: item === value })}
          data-value={item}
        >
          <motion.div
            className={cxCommon("option-text-checked-icon-container")}
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
            <span className={cxCommon("option-text-span")}>{item}</span>
            {isSelectedItem && (
              <span className={cxCommon("checked-icon-span")}>
                <IconCheck size={"1rem"} />
              </span>
            )}
          </motion.div>
        </Combobox.Option>
      );
    });

  const values = value.map((item) => (
    <Pill
      style={{
        backgroundColor: primaryColor,
        color: pillTextColor,
      }}
      key={item}
      withRemoveButton
      onRemove={() => handleValueRemove(item)}
    >
      {item}
    </Pill>
  ));

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
        <Portal {...portalProps}>
          <Stack
            className={`${cxCommon("search-input-and-options-container")} search-input-and-options-container`}
          >
            <Group className={cxCommon("back-btn-and-search-input-container")}>
              <ActionIcon
                variant="transparent"
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                <IconArrowLeft color={primaryColor} />
              </ActionIcon>
              <Combobox.Search
                className={cxCommon("search-input")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Type in to search"
              />
            </Group>
            <Group>
              <ActionIcon
                className={cx("deselect-all-btn")}
                onClick={handleDeselectAll}
              >
                <IconDeselect />
              </ActionIcon>

              <Button
                className={cx("close-btn")}
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                Close
              </Button>
            </Group>

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
