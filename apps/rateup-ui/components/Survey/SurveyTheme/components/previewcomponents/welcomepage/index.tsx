import React, { useContext, useEffect, useState } from "react";
import { SurveyThemeContext } from "../../../SurveyThemeContext";
import { produce } from "immer";
import {
  Flex,
  TextInput,
  BackgroundImage,
  Image,
  Tooltip,
  Box,
  ActionIcon,
  Textarea,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import classes from "../../../SurveyTheme.module.css";
import { PreviewTypeEnum, SelectedItemEnum } from "../../../SurveyTheme.enums";
import { getImageUrl } from "../../../SurveyTheme.utils";
import { dummyImage } from "../../../SurveyTheme.constants";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { cordinateStyle } from "../../../../../../utils";
import { surveyUploadsPath } from "../../../../../../utils/constants";

export default function WelcomePageThemeView({
  selectedType,
  setSelectedType,
}) {
  const { surveyTheme, setSurveyTheme, mobileOrDesktop } =
    useContext(SurveyThemeContext);
  const {
    welcomeTheme,
    surveyTheme: { logo: orgLogoStylesObj },
  } = surveyTheme;
  function updateThemeText(key: string, value: any) {
    setSurveyTheme(
      produce((draft) => {
        draft.welcomeTheme[key] = value;
      }),
    );
  }
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    button: { styles: buttonStyles, label, position },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
  } = welcomeTheme;

  let orgLogoStylesObject = orgLogoStylesObj;
  if (!orgLogoStylesObject) {
    orgLogoStylesObject = {
      logo: "",
      styles: {
        width: 50,
        height: 50,
      },
    };
  }
  const { logo: orgLogo, styles: orgLogoStyles } = orgLogoStylesObject;
  const [orgLogoSrc, setOrgLogoSrc] = useState("");
  useEffect(() => {
    let src = null;
    if ((orgLogo as any) instanceof File) {
      src = URL.createObjectURL(orgLogo as any);
    } else if (typeof orgLogo === "string" && orgLogo.length) {
      src = `${surveyUploadsPath}${orgLogo}`;
    }
    setOrgLogoSrc(src);
    () => {
      URL.revokeObjectURL(orgLogoSrc);
    };
  }, [orgLogo]);

  return (
    <Flex
      align={"center"}
      h="100%"
      style={styles}
      onClick={(e) => {
        e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
      }}
      ff={lexend300.style.fontFamily}
    >
      <CreditsCard
        enableCredits={unsplashImage?.[mobileOrDesktop]}
        url={
          mobileOrDesktop === PreviewTypeEnum.DESKTOP
            ? encodeURI(desktopbg)
            : encodeURI(mobilebg)
        }
      >
        <BackgroundImage
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={getImageUrl(
            mobileOrDesktop === PreviewTypeEnum.DESKTOP ? desktopbg : mobilebg,
            unsplashImage?.[mobileOrDesktop],
          )}
        >
          <Tooltip label={"Edit Background"}>
            <ActionIcon
              variant="default"
              size="md"
              radius="lg"
              onClick={(e) => {
                e.stopPropagation(),
                  setSelectedType(SelectedItemEnum.BACKGROUND);
              }}
              className={`${classes.actionIcon} ${mobileOrDesktop === PreviewTypeEnum.DESKTOP ? classes.welcomePageBgDtEditActionIcon : classes.welcomePageBgMbEditActionIcon}`}
            >
              <IconEdit style={{ width: "70%", height: "70%" }} />
            </ActionIcon>
          </Tooltip>

          <Flex
            justify={"center"}
            align={"center"}
            h={"100%"}
            direction={"column"}
            pos={"relative"}
          >
            {/* //---------------------------- */}

            {orgLogoSrc && (
              <Image
                src={orgLogoSrc}
                style={{ ...orgLogoStyles, alignSelf: "center" }}
                alt="logo"
              />
            )}

            <Tooltip label="Edit title">
              <Box className={classes.titleBox} mt={20}>
                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.TITLE);
                  }}
                  className={classes.actionIcon}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
                <TextInput
                  className={lexend.className}
                  placeholder={"Welcome"}
                  variant="unstyled"
                  size="xxl"
                  name="headerText"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.TITLE);
                  }}
                  styles={{
                    input: {
                      ...titleStyles,
                      fontFamily: "inherit",
                      height: "fit-content",
                    },
                  }}
                  value={title}
                  onChange={(e) =>
                    updateThemeText("title", {
                      ...welcomeTheme.title,
                      title: e.target.value,
                    })
                  }
                />
              </Box>
            </Tooltip>
            {/* //--------------------------- */}
            <Tooltip label="Edit subtitle">
              <Box className={classes.titleBox} mt={20} w={"50%"}>
                <ActionIcon
                  variant="default"
                  radius="lg"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.SUBTITLE);
                  }}
                  className={classes.actionIcon}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
                <Textarea
                  className={lexend.className}
                  placeholder={"Please fill the survey"}
                  variant="unstyled"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.SUBTITLE);
                  }}
                  name="descText"
                  styles={{
                    input: {
                      ...subtitleStyles,
                      fontFamily: "inherit",
                    },
                  }}
                  ta={"center"}
                  value={subtitle}
                  onChange={(e) =>
                    updateThemeText("subtitle", {
                      ...welcomeTheme.subtitle,
                      subtitle: e.target.value,
                    })
                  }
                />
              </Box>
            </Tooltip>

            <Box
              className={classes.buttonBox}
              style={{
                display: "flex",
                ...(position?.x ? cordinateStyle(position.x) : {}),
                ...(position?.y ? cordinateStyle(position.y) : {}),
              }}
            >
              <Flex
                justify={"center"}
                p={10}
                style={buttonStyles}
                onClick={(e) => e.stopPropagation()}
              >
                <ActionIcon
                  variant="default"
                  size="sm"
                  radius="lg"
                  onClick={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.BUTTON);
                  }}
                  className={classes.actionIcon}
                >
                  <IconEdit style={{ width: "70%", height: "70%" }} />
                </ActionIcon>
                <TextInput
                  onChange={(e) =>
                    updateThemeText("button", {
                      ...welcomeTheme.button,
                      label: e.target.value,
                    })
                  }
                  value={label}
                  placeholder={"Start Survey"}
                  variant="unstyled"
                  name="buttonText"
                  size="xs"
                  onFocus={(e) => {
                    e.stopPropagation(),
                      setSelectedType(SelectedItemEnum.BUTTON);
                  }}
                  styles={{
                    input: {
                      color: "inherit",
                      fontSize: "18px",
                      textAlign: "center",
                      minWidth: "150px",
                      alignSelf: "center",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    },
                  }}
                />
              </Flex>
            </Box>
          </Flex>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
