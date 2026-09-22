import { IconChartBar, IconLink, IconPalette, IconShare } from "@tabler/icons-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

function TabsListComp() {
  return (
    <div className="tabs-list-comp-tabs">
      <TabsList>
        <TabsTrigger value="links">
          <IconLink />
          Links
        </TabsTrigger>
        <TabsTrigger value="theme">
          <IconPalette />
          Theme
        </TabsTrigger>
        <TabsTrigger value="share">
          <IconShare />
          Share
        </TabsTrigger>
        <TabsTrigger value="stats">
          <IconChartBar />
          Stats
        </TabsTrigger>
      </TabsList>
    </div>
  );
}

export default TabsListComp;
