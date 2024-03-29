import { useRouter } from "next/router";
import { useGetLandingPageWithShortId } from "../../../backend/landingPage/landingPage.query";
import { Box, Center, Loader } from "@mantine/core";
import styles from "./LandingPageEditor.module.css";
import TabsListComp from "./TabsList";
import TabPanelsComp from "./TabPanels";
import { useEffect, useState } from "react";
import { lexend } from "../../../utils/fonts";
import { LandingPageContextProvider } from "./LandingPageContext/LandingPageContext";
import { useRouteParams } from "../../../context/RouteParamsContext";

function LandingPageEdtior() {
  const router = useRouter();
  const shortUrlId = router.query.shortUrlId;
  const tab = router.query?.tab;

  const defaultActiveTab = tab ? tab : "links";
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
        <p>Unable to get data, please try again later.</p>
      </Center>
    );
  }

  if (data) {
    componentToBeRendered = (
      <>
        <Box className={styles["landingPage-name-tabs-empty-div-container"]}>
          <Box>
            <h1 className={styles["landingPage-name-h1"]}>{data.name}</h1>
          </Box>
          <TabsListComp value={activeTab} onChange={setActiveTab} />
          <Box></Box>
        </Box>
        <TabPanelsComp value={activeTab} />
      </>
    );
  }

  return (
    <LandingPageContextProvider
      landingPageData={data}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <Box
        className={`${styles["landingPage-editor-page-root-div"]} ${lexend.variable}`}
      >
        {componentToBeRendered}
      </Box>
    </LandingPageContextProvider>
  );
}

export default LandingPageEdtior;
