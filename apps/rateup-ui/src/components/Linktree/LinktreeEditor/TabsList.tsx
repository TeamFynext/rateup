import { TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

function TabsListComp() {
  return (
    <div className="tabs-list-comp-tabs">
      <TabsList className="max-w-max overflow-hidden rounded-[0.625rem] border border-border">
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="share">Share</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>
    </div>
  );
}

export default TabsListComp;
