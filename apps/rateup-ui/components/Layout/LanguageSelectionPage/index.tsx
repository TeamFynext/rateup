import { useState } from "react";

import {
  Button,
  Flex,
  Image,
  MantineProvider,
  Radio,
  ScrollAreaAutosize,
  Stack,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronRight } from "@tabler/icons-react";
import classNames from "classnames/bind";

import { lexend } from "../../../utils/fonts";
import { CreditsCard } from "../../Card/CreditsCard";
import styles from "../../Survey/SurveyTheme/components/previewcomponents/languagePage/languagePage.module.css";
import surveyThemeStyles from "../../Survey/SurveyTheme/SurveyTheme.module.css";
import { useSelectedPreview } from "../../Survey/SurveyTheme/SurveyThemeContext";
import { SingleSelectCard } from "../../Survey/TakeSurvey/TakeSurveyComponent/SelectionCard/SingleSelectCard";
import { getBgImgAndBgColor } from "../TakeSurveyLayout/utils";

const cx = classNames.bind(styles);
const surveyThemeStylesCx = classNames.bind(surveyThemeStyles);

// In below jsx the class names have words like text input since same styles from language theme preview component's styles are being used here.
function LanguageSelectionPage({
  languages,
  setSelectedLanguage,
  surveyThemeData,
}) {
  const [lang, setLang] = useState(languages[0]);
  const selectedPreview = useSelectedPreview();

  const orgLogoSrc = surveyThemeData.surveyTheme?.logo?.logo;
  const orgLogoStyles = surveyThemeData.surveyTheme?.logo?.styles;

  const {
    languageTheme: {
      bg: { useSurveyBackground = false },
      title: { styles: titleStyles, title },
      subtitle: { styles: subtitleStyles, subtitle },
      button: { styles: buttonStyles, label: startBtnLabel },
      input: { primaryColor: inputPrimaryColor },
    },
  } = surveyThemeData;

  const isOrgLogoPresent = orgLogoSrc?.length > 0;
  const isMobile =
    useMediaQuery("(max-width: 768px)") || selectedPreview === "mobile";
  const { backgroundColor, backgroundImageSrc } = getBgImgAndBgColor(
    surveyThemeData,
    useSurveyBackground ? "surveyTheme" : "languageTheme",
    isMobile,
  );

  const isUnsplashImage = backgroundImageSrc?.startsWith(
    "https://images.unsplash.com",
  );

  return (
    <CreditsCard enableCredits={isUnsplashImage} url={backgroundImageSrc}>
      <Flex
        className={cx(
          "preview-language-page-container",
          { "org-logo-not-present": !isOrgLogoPresent },
          lexend.variable,
        )}
        style={{
          backgroundColor,
          backgroundImage: `url(${backgroundImageSrc})`,
        }}
      >
        {isOrgLogoPresent && (
          <Flex className={cx("logo-container")}>
            <Image
              className={cx("logo")}
              src={orgLogoSrc}
              style={orgLogoStyles}
              fit="contain"
            />
          </Flex>
        )}

        <Stack className={cx("header-radio-grp-start-btn-container")}>
          <Stack className={cx("header")}>
            <Stack className={surveyThemeStylesCx("titleBox")}>
              <p
                style={{
                  ...subtitleStyles,
                  fontFamily: `var(--font-lexend)`,
                  height: "fit-content",
                }}
              >
                {subtitle}
              </p>
            </Stack>

            <Stack className={surveyThemeStylesCx("titleBox")}>
              <p
                style={{
                  ...titleStyles,
                  fontFamily: `var(--font-lexend)`,
                  height: "fit-content",
                }}
              >
                {title}
              </p>
            </Stack>
          </Stack>

          <Flex className={cx("languages-list-radio-grp-container")}>
            <ScrollAreaAutosize
              mah={"100%"}
              offsetScrollbars
              scrollbarSize={10}
            >
              <MantineProvider
                getRootElement={() => {
                  return typeof window === "undefined"
                    ? undefined
                    : document.querySelector(
                        `.${cx("languages-list-radio-grp-container")}`,
                      );
                }}
                cssVariablesSelector={`.${cx("languages-list-radio-grp-container")}`}
                theme={{
                  colors: {
                    // @ts-ignore
                    primaryColor: Array(10).fill(inputPrimaryColor),
                  },
                  primaryColor: "primaryColor",
                }}
              >
                <Radio.Group value={lang} onChange={setLang} miw={"200px"}>
                  <SingleSelectCard
                    data={languages}
                    selectedValue={lang}
                    sizeTrim
                  />
                </Radio.Group>
              </MantineProvider>
            </ScrollAreaAutosize>
          </Flex>

          <Flex
            className={`${surveyThemeStylesCx("buttonBox")} ${cx("start-btn-text-input-wrapper")}`}
          >
            <Flex
              className={cx("start-btn-text-input-container")}
              onClick={(e) => e.stopPropagation()}
              p={0}
            >
              <Button
                radius={"xl"}
                onClick={() => setSelectedLanguage(lang)}
                rightSection={<IconChevronRight />}
                style={{
                  backgroundColor: buttonStyles?.backgroundColor,
                  color: buttonStyles?.color,
                  fontSize: "1.125rem",
                  height: "auto",
                  padding: "0.75rem 1rem 0.75rem 1.5625rem",
                }}
              >
                {startBtnLabel}
              </Button>
            </Flex>
          </Flex>
        </Stack>
      </Flex>
    </CreditsCard>
  );
}

export default LanguageSelectionPage;
