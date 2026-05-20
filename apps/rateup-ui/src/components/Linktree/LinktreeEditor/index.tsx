"use client";

import { useEffect, useState } from "react";

import { Box, Center, Loader } from "@mantine/core";
import { useParams, useSearch } from "@tanstack/react-router";

import { useGetLinktreeWithShortId } from "@/backend/linktree/linktree.query";

import { useRouteParams } from "@/context/RouteParamsContext.tsx";
import { LinktreeContextProvider } from "./LinktreeContext/LinktreeContext.tsx";
import styles from "./LinktreeEditor.module.css";
import TabPanelsComp from "./TabPanels.tsx";
import TabsListComp from "./TabsList.tsx";

function LinktreeEdtior() {
  const searchParams = useSearch({ strict: false });
  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const tab = searchParams.tab;

  const defaultActiveTab = tab ? tab : "links";
  const { isPending, isError, data } = useGetLinktreeWithShortId(shortUrlId);
  const [activeTab, setActiveTab] = useState(defaultActiveTab);

  // This useEffect, update is to display linktree name in breadcrumbs.
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
        <p>Unable to get data, please try again later.</p>
      </Center>
    );
  }

  if (data) {
    componentToBeRendered = (
      <>
        <Box className={styles["linktree-name-tabs-empty-div-container"]}>
          <Box>
            <h1 className={styles["linktree-name-h1"]}>{data.name}</h1>
          </Box>
          <TabsListComp value={activeTab} onChange={setActiveTab} />
          <Box></Box>
        </Box>
        <TabPanelsComp value={activeTab} />
      </>
    );
  }

  return (
    <LinktreeContextProvider
      linktreeData={data}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <Box className={`${styles["linktree-editor-page-root-div"]}`}>
        {componentToBeRendered}
      </Box>
    </LinktreeContextProvider>
  );
}

export default LinktreeEdtior;
