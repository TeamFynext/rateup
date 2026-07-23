import { IconArrowLeft, IconCheck, IconChevronDown } from "@tabler/icons-react";
import classNames from "classnames/bind";
import { motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";

import { getBgImgAndBgColor } from "../../../../../Layout/TakeSurveyLayout/utils.ts";
import { isLightColor, luminance } from "../../QuestionForms/isLightColor.ts";
import { useThemePrimaryColor } from "../../QuestionForms/useThemePrimaryColor.ts";

import styles from "./CustomSelectForMobile.module.css";

const cx = classNames.bind(styles);

interface CustomSelectForMobileProps {
  value: string;
  data: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  portalTarget?: HTMLElement | null;
}

function CustomSelectForMobile({
  value,
  data,
  placeholder,
  onChange,
  portalTarget,
}: Readonly<CustomSelectForMobileProps>) {
  const themePrimaryColor = useThemePrimaryColor();

  const primaryColor = luminance(themePrimaryColor) > 0.8 ? `#495057` : themePrimaryColor;

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const surveyThemeData = useSurveyThemeData();
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    "surveyTheme",
    true,
  );

  const [search, setSearch] = useState("");
  const [isOptionSelectionDivVisible, setIsOptionSelectionDivVisible] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const [scope, animate] = useAnimate();
  const { t: translations } = useTranslation();
  const optionsMotionDivRefs = useRef(null);

  const filteredData = data?.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase().trim()),
  );

  function getOptionsMotionDivsMap() {
    if (!optionsMotionDivRefs.current) {
      optionsMotionDivRefs.current = new Map();
    }
    return optionsMotionDivRefs.current;
  }

  useEffect(() => {
    setSearch("");
  }, [isOptionSelectionDivVisible]);

  useEffect(() => {
    if (portalTarget) {
      setPortalNode(portalTarget);
      return;
    }
    const node = document.createElement("div");
    node.setAttribute("data-portal", "true");
    document.body.appendChild(node);
    setPortalNode(node);
    return () => {
      document.body.removeChild(node);
    };
  }, [portalTarget]);

  const handleOptionSelect = async (val: string) => {
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
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOptionSelectionDivVisible(true)}
        style={{ border: `1px solid ${primaryColor}` }}
        className="flex min-h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-4 py-2.5 text-left text-sm transition-[color,box-shadow] max-[480px]:min-h-11"
      >
        {value || <span className="text-muted-foreground">{placeholder || "Pick value"}</span>}
        <IconChevronDown size={16} className="shrink-0 opacity-60" />
      </button>
      {isOptionSelectionDivVisible &&
        portalNode &&
        createPortal(
          <div
            className={`${cx("search-input-and-options-container")} flex flex-col`}
            style={{
              backgroundColor,
              backgroundImage: `url(${backgroundImageSrc})`,
            }}
          >
            <div className={`${cx("back-btn-and-search-input-container")} flex items-center`}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOptionSelectionDivVisible(false)}
              >
                <IconArrowLeft color={primaryColor} />
              </Button>
              <input
                type="text"
                className={cx("search-input")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder={translations("Type in to search")}
              />
            </div>
            <div className={cx("options-container-root")}>
              <ScrollArea className="h-full">
                <div ref={scope} className={`${cx("options-container-div")} flex flex-col`}>
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => {
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
                        <button
                          type="button"
                          key={item}
                          onClick={() => handleOptionSelect(item)}
                          className={cx("option")}
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
                        </button>
                      );
                    })
                  ) : (
                    <span>{translations("Nothing found...")}</span>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>,
          portalNode,
        )}
    </>
  );
}

export default CustomSelectForMobile;
