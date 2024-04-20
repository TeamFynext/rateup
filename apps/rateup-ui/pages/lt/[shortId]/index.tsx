import { Box, Group, Image, Textarea } from "@mantine/core";
import { getPublicLandingPageWithShortId } from "../../../backend/landingPage/landingPage.api";
import { initialState as defaultTheme } from "../../../components/LandingPageDashboardPage/LandingPageEditor/ThemeEditor/ThemeContext/constants";
import styles from "./lt.module.css";
import { useMediaQuery } from "@mantine/hooks";
import { imagesPath } from "../../../utils/constants";
import { lexend } from "../../../utils/fonts";
import UnsplashCreditText from "../../../components/LandingPageDashboardPage/LandingPageEditor/ThemeEditor/components/UnsplashCreditText";
import { useCallback, useEffect } from "react";
import { produce } from "immer";
import { usePageVisitsOrLinkClicksUpdateMutation } from "../../../backend/landingPage/landingPage.query";

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

  const shortUrlId = landingPageObj?.shortUrlId;
  const pageVisitsOrLinkClicksMutation =
    usePageVisitsOrLinkClicksUpdateMutation(shortUrlId);

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

  useEffect(() => {
    const landingPageVisitsData = localStorage.getItem("landingPageVisitsData");
    if (!landingPageVisitsData) {
      localStorage.setItem(
        "landingPageVisitsData",
        JSON.stringify({
          [shortUrlId]: {
            lastVisitedAt: new Date().toISOString(),
            linkClicks: {},
          },
        }),
      );
      pageVisitsOrLinkClicksMutation.mutate({
        resourceToBeUpdated: "page-visit",
      });
    } else if (landingPageVisitsData) {
      const parsedVisitsDataObj = JSON.parse(
        localStorage.getItem("landingPageVisitsData"),
      );
      const currentLandingPageLastVisited =
        parsedVisitsDataObj[shortUrlId]?.lastVisitedAt;
      if (!currentLandingPageLastVisited) {
        const updatedParsedVisitsDataObj = produce(
          parsedVisitsDataObj,
          (draft) => {
            draft[shortUrlId] = {
              lastVisitedAt: new Date().toISOString(),
              linkClicks: {},
            };
          },
        );
        localStorage.setItem(
          "landingPageVisitsData",
          JSON.stringify(updatedParsedVisitsDataObj),
        );
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "page-visit",
        });
        return;
      }

      const newDateObj = new Date();
      // currentLandingPageLastVisited is an ISO time string.
      const lastVisitedDateObj = new Date(currentLandingPageLastVisited);

      const differenceInMinutes =
        (+newDateObj - +lastVisitedDateObj) / (1000 * 60);

      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(
          parsedVisitsDataObj,
          (draft) => {
            draft[shortUrlId].lastVisitedAt = new Date().toISOString();
          },
        );
        localStorage.setItem(
          "landingPageVisitsData",
          JSON.stringify(updatedParsedVisitsDataObj),
        );
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "page-visit",
        });
      }
    }
  }, []);

  const handleLinkClick = useCallback((linkId) => {
    const shortUrlId = landingPageObj.shortUrlId;
    const parsedVisitsDataObj = JSON.parse(
      localStorage.getItem("landingPageVisitsData"),
    );
    const linkClicksObj = parsedVisitsDataObj[shortUrlId]["linkClicks"][linkId];
    if (!linkClicksObj) {
      const updatedParsedVisitsDataObj = produce(
        parsedVisitsDataObj,
        (draft) => {
          draft[shortUrlId]["linkClicks"][linkId] = {
            lastClickedAt: new Date().toISOString(),
          };
        },
      );
      localStorage.setItem(
        "landingPageVisitsData",
        JSON.stringify(updatedParsedVisitsDataObj),
      );
      pageVisitsOrLinkClicksMutation.mutate({
        resourceToBeUpdated: "link-click",
        linkId,
      });
    } else if (linkClicksObj) {
      // lastClickedAt is ISO time string.
      const { lastClickedAt } = linkClicksObj;
      const lastClickedDateObj = new Date(lastClickedAt);
      const newDateObj = new Date();
      const differenceInMinutes =
        (+newDateObj - +lastClickedDateObj) / (1000 * 60);
      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(
          parsedVisitsDataObj,
          (draft) => {
            draft[shortUrlId]["linkClicks"][linkId]["lastClickedAt"] =
              new Date().toISOString();
          },
        );
        localStorage.setItem(
          "landingPageVisitsData",
          JSON.stringify(updatedParsedVisitsDataObj),
        );
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "link-click",
          linkId,
        });
      }
    }
  }, []);

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
              onClick={() => handleLinkClick(id)}
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
