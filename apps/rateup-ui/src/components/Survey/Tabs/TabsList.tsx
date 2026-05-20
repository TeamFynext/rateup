"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

function TabsListComp({ value, onChange, tabs }) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            value={tab}
            key={tab}
            className="capitalize data-[state=active]:bg-primary data-[state=active]:text-background transition-colors"
          >
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
