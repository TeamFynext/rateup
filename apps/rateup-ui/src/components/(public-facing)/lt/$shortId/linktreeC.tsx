import { Box, Image } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { produce } from "immer";
import { useCallback, useEffect } from "react";

import { usePageVisitsOrLinkClicksUpdateMutation } from "@/backend/linktree/linktree.query";
import UnsplashCreditText from "@/components/Linktree/LinktreeEditor/ThemeEditor/components/UnsplashCreditText/index.tsx";
import { initialState as defaultTheme } from "@/components/Linktree/LinktreeEditor/ThemeEditor/ThemeContext/constants.ts";
import { imagesPath } from "@/utils/constants.ts";

import styles from "./lt.module.css";

const LinkTreeC = ({ linktreeObj }) => {
  const shortUrlId = linktreeObj?.shortUrlId;
  const pageVisitsOrLinkClicksMutation = usePageVisitsOrLinkClicksUpdateMutation(shortUrlId);

  const isMobile = useMediaQuery("(max-width: 425px)");

  const theme = linktreeObj?.theme ?? defaultTheme;
  const links = linktreeObj?.links ?? [];
  const {
    background: { styles: backgroundStyles, desktopBgImgUrl, mobileBgImgUrl },
    logo: { styles: logoStyles, logoUrl },
    title: { styles: titleStyles, text: titleText },
    subtitle: { styles: subtitleStyles, text: subtitleText },
    linkListItem: { styles: linkListItemStyles },
  } = theme;

  const backgroundImageObj = {};
  if (!isMobile) {
    backgroundImageObj["backgroundImage"] = `url(${desktopBgImgUrl})`;
  } else if (isMobile) {
    backgroundImageObj["backgroundImage"] = `url(${mobileBgImgUrl})`;
  }
  const backgroundStylesObj = {
    ...backgroundStyles,
    ...backgroundImageObj,
  };

  useEffect(() => {
    const linktreeVisitsData = localStorage.getItem("linktreeVisitsData");
    if (!linktreeVisitsData) {
      localStorage.setItem(
        "linktreeVisitsData",
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
    } else if (linktreeVisitsData) {
      const parsedVisitsDataObj = JSON.parse(localStorage.getItem("linktreeVisitsData"));
      const currentLinktreeLastVisited = parsedVisitsDataObj[shortUrlId]?.lastVisitedAt;
      if (!currentLinktreeLastVisited) {
        const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
          draft[shortUrlId] = {
            lastVisitedAt: new Date().toISOString(),
            linkClicks: {},
          };
        });
        localStorage.setItem("linktreeVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "page-visit",
        });
        return;
      }

      const newDateObj = new Date();
      // currentLinktreeLastVisited is an ISO time string.
      const lastVisitedDateObj = new Date(currentLinktreeLastVisited);

      const differenceInMinutes = (+newDateObj - +lastVisitedDateObj) / (1000 * 60);

      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
          draft[shortUrlId].lastVisitedAt = new Date().toISOString();
        });
        localStorage.setItem("linktreeVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "page-visit",
        });
      }
    }
  }, []);

  const handleLinkClick = useCallback((linkId) => {
    const shortUrlId = linktreeObj.shortUrlId;
    const parsedVisitsDataObj = JSON.parse(localStorage.getItem("linktreeVisitsData"));
    const linkClicksObj = parsedVisitsDataObj[shortUrlId]["linkClicks"][linkId];
    if (!linkClicksObj) {
      const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
        draft[shortUrlId]["linkClicks"][linkId] = {
          lastClickedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem("linktreeVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
      pageVisitsOrLinkClicksMutation.mutate({
        resourceToBeUpdated: "link-click",
        linkId,
      });
    } else if (linkClicksObj) {
      // lastClickedAt is ISO time string.
      const { lastClickedAt } = linkClicksObj;
      const lastClickedDateObj = new Date(lastClickedAt);
      const newDateObj = new Date();
      const differenceInMinutes = (+newDateObj - +lastClickedDateObj) / (1000 * 60);
      if (differenceInMinutes > 60) {
        const updatedParsedVisitsDataObj = produce(parsedVisitsDataObj, (draft) => {
          draft[shortUrlId]["linkClicks"][linkId]["lastClickedAt"] = new Date().toISOString();
        });
        localStorage.setItem("linktreeVisitsData", JSON.stringify(updatedParsedVisitsDataObj));
        pageVisitsOrLinkClicksMutation.mutate({
          resourceToBeUpdated: "link-click",
          linkId,
        });
      }
    }
  }, []);

  return (
    <Box style={backgroundStylesObj} className={`${styles["root-div"]}`}>
      <Box className={styles["logo-img-container"]}>
        {logoUrl ? (
          <Image src={logoUrl} alt="logo" style={{ ...logoStyles, objectFit: "contain" }} />
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
};

export default LinkTreeC;
