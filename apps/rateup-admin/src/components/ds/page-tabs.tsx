import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PageTab<T extends string> {
  value: T;
  label: string;
  content: ReactNode;
}

/**
 * The console's section tabs: uppercase line tabs under a hairline, as in the top bar. On
 * a phone the row scrolls sideways instead of wrapping. Only the active tab is mounted, so
 * each tab's query runs when it is opened.
 */
export function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: PageTab<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as T)} className="gap-8">
      <div className="-mx-4 overflow-x-auto border-b px-4 scrollbar-none sm:mx-0 sm:px-0">
        <TabsList variant="line" className="h-11 gap-6 p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-full flex-none px-0 text-[13px] font-medium tracking-[0.04em] uppercase data-active:font-semibold"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
