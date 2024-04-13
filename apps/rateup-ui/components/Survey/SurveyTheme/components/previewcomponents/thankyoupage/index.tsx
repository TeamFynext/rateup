import {
  ActionIcon,
  BackgroundImage,
  Box,
  Flex,
  Image,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { produce } from "immer";
import { useContext, useEffect, useState } from "react";
import Confetti from "react-confetti";
import { lexend, lexend300 } from "../../../../../../utils/fonts";
import { CreditsCard } from "../../../../../Card/CreditsCard";
import { PreviewTypeEnum, SelectedItemEnum } from "../../../SurveyTheme.enums";
import classes from "../../../SurveyTheme.module.css";
import { getImageUrl } from "../../../SurveyTheme.utils";
import { SurveyThemeContext } from "../../../SurveyThemeContext";
import { surveyUploadsPath } from "../../../../../../utils/constants";
export default function ThankyouPageThemeView({
  selectedType,
  setSelectedType,
}) {
  const { surveyTheme, setSurveyTheme, mobileOrDesktop } =
    useContext(SurveyThemeContext);
  const {
    thankyouTheme,
    surveyTheme: { logo: orgLogoStylesObj },
  } = surveyTheme;
  const { ref, width, height } = useElementSize();
  const {
    bg: { styles, desktopbg, mobilebg, unsplashImage },
    subtitle: { styles: subtitleStyles, subtitle },
    title: { styles: titleStyles, title },
    confettiEnabled,
  } = thankyouTheme;
  function updateThemeText(key: string, value: any) {
    setSurveyTheme(
      produce((draft) => {
        draft.thankyouTheme[key] = value;
      }),
    );
  }

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
          ref={ref}
          className={classes.parentContainer}
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          src={getImageUrl(
            mobileOrDesktop === PreviewTypeEnum.DESKTOP ? desktopbg : mobilebg,
            unsplashImage?.[mobileOrDesktop],
          )}
        >
          {confettiEnabled && <Confetti width={width} height={height} />}
          <ActionIcon
            variant="default"
            size="md"
            radius="lg"
            onClick={(e) => {
              e.stopPropagation(), setSelectedType(SelectedItemEnum.BACKGROUND);
            }}
            className={`${classes.actionIcon} ${classes.bgActionIcon}`}
          >
            <IconEdit style={{ width: "70%", height: "70%" }} />
          </ActionIcon>
          <form style={{ width: "100%", height: "100%" }}>
            <Flex
              justify={"center"}
              align={"center"}
              h={"100%"}
              direction={"column"}
            >
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
                    placeholder={"Thankyou"}
                    variant="unstyled"
                    size="xxl"
                    name="headerText"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setSelectedType(SelectedItemEnum.TITLE);
                    }}
                    styles={{
                      input: {
                        ...titleStyles,
                        height: "fit-content",
                        fontFamily: "inherit",
                      },
                    }}
                    value={title}
                    onChange={(e) =>
                      updateThemeText("title", {
                        ...thankyouTheme.title,
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
                    onChange={(e) =>
                      updateThemeText("subtitle", {
                        ...thankyouTheme.subtitle,
                        subtitle: e.target.value,
                      })
                    }
                    value={subtitle}
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
                    mt="lg"
                    ta={"center"}
                  />
                </Box>
              </Tooltip>
            </Flex>
          </form>
        </BackgroundImage>
      </CreditsCard>
    </Flex>
  );
}
