import {
  ActionIcon,
  Button,
  Combobox,
  ComboboxChevron,
  Group,
  Input,
  isLightColor,
  luminance,
  Pill,
  PillsInput,
  Portal,
  ScrollAreaAutosize,
  Stack,
  useCombobox,
  useMantineTheme,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconDeselect } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";

import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";

import commonStyles from "../CustomSelectForMobile/CustomSelectForMobile.module.css";
import styles from "./CustomMultiselectForMobile.module.css";

const cxCommon = classNames.bind(commonStyles);
const cx = classNames.bind(styles);

function CustomMultiselectForMobile({ value, data, onChange, placeholder, portalProps = {} }) {
  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const primaryColor =
    luminance(themePrimaryColor) > 0.8 ? `var(--mantine-color-gray-7)` : themePrimaryColor;
  const pillTextColor = isLightColor(primaryColor) ? "#000000" : "#FFFFFF";

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const surveyThemeData = useSurveyThemeData();
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    "surveyTheme",
    true,
  );

  const [, animate] = useAnimate();
  const optionsMotionDivRefs = useRef(null);

  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] = useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });
  const { t: translations } = useTranslation();
  const handleValueSelect = async (val) => {
    const valuesArr = value;
    const newValuesArr = value.includes(val) ? value.filter((v) => v !== val) : [...value, val];

    onChange(newValuesArr);

    const domEle = getOptionsMotionDivsMap().get(val);
    const unSelectedOptionStyleObj = {
      backgroundColor: "rgba(0,0,0,0)",
      color: primaryColor,
      borderColor: primaryColor,
    };
    const selectedOptionStyleObj = {
      backgroundColor: primaryColor,
      color: foregroundColor,
      borderColor: primaryColor,
    };

    if (valuesArr.includes(val)) {
      if (domEle) animate(domEle, unSelectedOptionStyleObj, { duration: 0.2 });
    }

    if (!valuesArr.includes(val)) {
      if (domEle) {
        await animate(domEle, selectedOptionStyleObj, { duration: 0.5 });
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
          {
            backgroundColor: "rgba(0,0,0,0)",
            color: primaryColor,
            borderColor: primaryColor,
          },
          { duration: 0.2 },
        );
    });
    onChange([]);
  };

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => {
      const isSelectedItem = value.includes(item);
      const unSelectedOptionStyleObj = {
        backgroundColor: "rgba(0,0,0,0)",
        color: primaryColor,
        borderColor: primaryColor,
      };
      const selectedOptionStyleObj = {
        backgroundColor: primaryColor,
        color: foregroundColor,
        borderColor: primaryColor,
      };
      const styleObj = isSelectedItem ? selectedOptionStyleObj : unSelectedOptionStyleObj;

      return (
        <Combobox.Option
          value={item}
          key={item + primaryColor}
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
            <Input.Placeholder>{placeholder || "Pick values"}</Input.Placeholder>
          </Pill.Group>
          <ComboboxChevron />
        </PillsInput>
      </Combobox.EventsTarget>
      {isOptionSelectionDivVisible && (
        <Portal {...portalProps}>
          <Stack
            className={`${cxCommon("search-input-and-options-container")} search-input-and-options-container`}
            style={{
              backgroundColor,
              backgroundImage: `url(${backgroundImageSrc})`,
            }}
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
                placeholder={translations("Type in to search")}
              />
            </Group>

            <Combobox.Options className={cxCommon("options-container-root")}>
              <ScrollAreaAutosize h={"100%"} scrollbarSize={7} offsetScrollbars>
                <Stack className={cxCommon("options-container-div")}>
                  {options.length > 0 ? (
                    options
                  ) : (
                    <Combobox.Empty>{translations("Nothing found...")}</Combobox.Empty>
                  )}
                </Stack>
              </ScrollAreaAutosize>
            </Combobox.Options>

            <Group className={cx("close-deselect-btns-container")}>
              <ActionIcon
                className={cx("deselect-all-btn")}
                onClick={handleDeselectAll}
                color={themePrimaryColor}
              >
                <IconDeselect size={"1.75rem"} />
              </ActionIcon>

              <Button
                className={cx("close-btn")}
                onClick={() => setIsOptionSelectionDivVisible(false)}
                color={themePrimaryColor}
              >
                {translations("Done")}
              </Button>
            </Group>
          </Stack>
        </Portal>
      )}
    </Combobox>
  );
}

export default CustomMultiselectForMobile;
