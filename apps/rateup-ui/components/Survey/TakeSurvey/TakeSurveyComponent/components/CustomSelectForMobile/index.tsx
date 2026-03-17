"use client";

import { useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Combobox,
  Group,
  Input,
  InputBase,
  isLightColor,
  luminance,
  Portal,
  ScrollAreaAutosize,
  Stack,
  useCombobox,
  useMantineTheme,
} from "@mantine/core";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { motion, useAnimate } from "motion/react";
import { useExtracted } from "next-intl";

import { useSurveyThemeData } from "../../../../../../context/SurveyThemeContext";
import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils";
import styles from "./CustomSelectForMobile.module.css";

const cx = classNames.bind(styles);

function CustomSelectForMobile({
  value,
  data,
  placeholder,
  onChange,
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

  const foregroundColor = isLightColor(themePrimaryColor)
    ? "#000000"
    : "#FFFFFF";

  const surveyThemeData = useSurveyThemeData();
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    "surveyTheme",
    true,
  );

  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] =
    useState(false);
  const combobox = useCombobox({
    onDropdownClose: () => {
      setSearch("");
    },
  });

  const [scope, animate] = useAnimate();
  const translations = useExtracted();
  const optionsMotionDivRefs = useRef(null);

  const options = data
    ?.filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => {
      const isSelected = item === value;
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
      const styleObj = isSelected
        ? selectedOptionStyleObj
        : unSelectedOptionStyleObj;

      return (
        <Combobox.Option
          value={item}
          key={item + primaryColor}
          className={cx("option", { selected: isSelected })}
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
            {
              backgroundColor: "rgba(0,0,0,0)",
              color: primaryColor,
              borderColor: primaryColor,
            },
            { duration: 0.2 },
          );

        if (value !== val) {
          await animate(
            selectedEle,
            {
              backgroundColor: primaryColor,
              color: foregroundColor,
              borderColor: primaryColor,
            },
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
        <Portal {...portalProps}>
          <Stack
            className={`${cx("search-input-and-options-container")} search-input-and-options-container`}
            style={{
              backgroundColor,
              backgroundImage: `url(${backgroundImageSrc})`,
            }}
          >
            <Group className={cx("back-btn-and-search-input-container")}>
              <ActionIcon
                variant="transparent"
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                <IconArrowLeft color={primaryColor} />
              </ActionIcon>
              <Combobox.Search
                className={cx("search-input")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder={translations("Type in to search")}
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
                    <Combobox.Empty>
                      {translations("Nothing found...")}
                    </Combobox.Empty>
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
