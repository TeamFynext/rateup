import { Box, Group, Image, Textarea } from "@mantine/core";
import { getPublicLandingPageWithShortId } from "../../../backend/landingPage/landingPage.api";
import { initialState as defaultTheme } from "../../../components/LandingPageDashboardPage/LandingPageEditor/ThemeEditor/ThemeContext/constants";
import styles from "./lt.module.css";
import { useMediaQuery } from "@mantine/hooks";
import { imagesPath } from "../../../utils/constants";
import { lexend } from "../../../utils/fonts";
import { IconChevronRight } from "@tabler/icons-react";
import UnsplashCreditText from "../../../components/LandingPageDashboardPage/LandingPageEditor/ThemeEditor/components/UnsplashCreditText";

export const getServerSideProps = async (context) => {
  const { shortId } = context.params;
  const landingPageObj = await getPublicLandingPageWithShortId(shortId);
  if (landingPageObj?.isPublished) {
    return {
      props: {
        landingPageObj,
      },
    };
  } else {
    return {
      props: {
        landingPageObj: null,
      },
    };
  }
};

// LandingPage Public Page
function Lt({ landingPageObj }) {
  if (!landingPageObj) {
    return (
      <Group className={styles["not-available-div"]}>
        <Image src={"/images/bw-logo.png"} alt="logo" width={70} height={70} />
        <p className={styles["not-available-p"]}>LandingPage Not available</p>
      </Group>
    );
  }

  const isMobile = useMediaQuery("(max-width: 425px)");

  const theme = landingPageObj?.theme ?? defaultTheme;
  const links = landingPageObj?.links ?? [];
  const {
    background: { styles: backgroundStyles, desktopBgImgUrl, mobileBgImgUrl },
    logo: { styles: logoStyles, logoUrl },
    title: { styles: titleStyles, text: titleText },
    subtitle: { styles: subtitleStyles, text: subtitleText },
    linkListItem: { styles: linkListItemStyles },
  } = theme;

  let backgroundImageUrl = "";
  const backgroundImageObj = {};
  if (!isMobile) {
    if (desktopBgImgUrl) backgroundImageUrl = desktopBgImgUrl;
    backgroundImageObj["backgroundImage"] = `url(${desktopBgImgUrl})`;
  } else if (isMobile) {
    if (mobileBgImgUrl) backgroundImageUrl = mobileBgImgUrl;
    backgroundImageObj["backgroundImage"] = `url(${mobileBgImgUrl})`;
  }
  const backgroundStylesObj = {
    ...backgroundStyles,
    ...backgroundImageObj,
  };

  return (
    <Box
      style={backgroundStylesObj}
      className={`${styles["root-div"]} ${lexend.variable}`}
    >
      <Box className={styles["logo-img-container"]}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="logo"
            style={{ ...logoStyles, objectFit: "contain" }}
          />
        ) : (
          <Image
            src={`${imagesPath}/camera-off.svg`}
            alt="logo"
            style={{ ...logoStyles, objectFit: "contain" }}
          />
        )}
      </Box>

      <Box className={styles["title-div-container"]}>
        <h1 className={styles["title"]} style={titleStyles}>
          {titleText}
        </h1>
      </Box>

      <Box className={styles["subtitle-div-container"]}>
        <p className={styles["subtitle-p"]} style={subtitleStyles}>
          {subtitleText}
        </p>
      </Box>

      <Box className={styles["links-list-container"]}>
        {links.map(({ id, linkDisplayName, linkUrl }) => {
          return (
            <a
              target="_blank"
              key={id}
              className={styles["link-list-item"]}
              style={linkListItemStyles}
              href={linkUrl}
            >
              <span>{linkDisplayName}</span>
            </a>
          );
        })}
      </Box>
      <UnsplashCreditText url={isMobile ? mobileBgImgUrl : desktopBgImgUrl} />
    </Box>
  );
}

export default Lt;
