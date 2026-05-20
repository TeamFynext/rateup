"use client";

import { useEffect, useState } from "react";

import { Box, Center, Loader } from "@mantine/core";
import { useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useGetLandingPageWithShortId } from "@/backend/landingPage/landingPage.query";

import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { LandingPageContextProvider } from "./LandingPageContext/LandingPageContext.tsx";
import styles from "./LandingPageEditor.module.css";
import TabPanelsComp from "./TabPanels.tsx";
import TabsListComp from "./TabsList.tsx";

function LandingPageEditor() {
  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const tab = searchParams.tab;
  const { t: translations } = useTranslation();
  const defaultActiveTab = tab ? tab : "edit";
  const { isPending, isError, data } = useGetLandingPageWithShortId(shortUrlId);
  const [activeTab, setActiveTab] = useState(defaultActiveTab);

  // This useEffect, update is to display landingPage name in breadcrumbs.
  const { update } = useRouteParams();
  useEffect(() => {
    if (data?.name) update({ shortUrlId: data.name });
  }, [data?.name]);

  let componentToBeRendered = null;

  if (isPending) {
    componentToBeRendered = (
      <Center w={"100%"} h={"100%"}>
        <Loader type="bars" />
      </Center>
    );
  }

  if (isError) {
    componentToBeRendered = (
      <Center w={"100%"} h={"100%"}>
        <p>{translations("Unable to get data, please try again later.")}</p>
      </Center>
    );
  }

  if (data) {
    componentToBeRendered = (
      <LandingPageContextProvider
        landingPageData={data}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        <Box className={styles["landingPage-name-tabs-empty-div-container"]}>
          <Box>
            <h1 className={styles["landingPage-name-h1"]}>{data.name}</h1>
          </Box>
          <TabsListComp value={activeTab} onChange={setActiveTab} />
          <Box></Box>
        </Box>
        <TabPanelsComp value={activeTab} />
      </LandingPageContextProvider>
    );
  }

  return (
    <Box className={`${styles["landingPage-editor-page-root-div"]}`}>
      {componentToBeRendered}
    </Box>
  );
}

export default LandingPageEditor;
