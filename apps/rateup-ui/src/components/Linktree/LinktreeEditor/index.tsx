import { useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useGetLinktreeWithShortId } from "@/backend/linktree/linktree.query";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs } from "@/components/ui/tabs.tsx";
import { useRouteParams } from "@/context/RouteParamsContext.tsx";

import { LinktreeContextProvider } from "./LinktreeContext/LinktreeContext.tsx";
import TabPanelsComp from "./TabPanels.tsx";
import TabsListComp from "./TabsList.tsx";

import styles from "./LinktreeEditor.module.css";

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
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    componentToBeRendered = (
      <div className="flex h-full w-full items-center justify-center">
        <p>Unable to get data, please try again later.</p>
      </div>
    );
  }

  if (data) {
    componentToBeRendered = (
      <>
        <div className={styles["linktree-name-tabs-empty-div-container"]}>
          <div>
            <h1 className={styles["linktree-name-h1"]}>{data.name}</h1>
          </div>
          <TabsListComp />
          <div></div>
        </div>
        <TabPanelsComp />
      </>
    );
  }

  return (
    <LinktreeContextProvider linktreeData={data!} activeTab={activeTab} setActiveTab={setActiveTab}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={styles["linktree-editor-page-root-div"]}
      >
        {componentToBeRendered}
      </Tabs>
    </LinktreeContextProvider>
  );
}

export default LinktreeEdtior;
