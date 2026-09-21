import { type TablerIcon } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import InfoButton from "@/components/Button/InfoButton.tsx";
import { BackLink } from "@/components/common/back-link.tsx";
import { SECTION_TITLE } from "@/components/common/page-heading.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import { docsPath } from "@/utils/constants.ts";

export interface SurveyHeaderTab<T extends string> {
  value: T;
  label: string;
  icon: TablerIcon;
}

interface SurveyPageHeaderProps<T extends string> {
  title: string;
  activeTab: T;
  onTabChange: (value: T) => void;
  tabs: SurveyHeaderTab<T>[];
}

export default function SurveyPageHeader<T extends string>({
  title,
  activeTab,
  onTabChange,
  tabs,
}: Readonly<SurveyPageHeaderProps<T>>) {
  const { t: translations } = useTranslation();

  return (
    <div className="flex-shrink-0 bg-background">
      <div className="flex h-[62px] items-center gap-4 border-b border-border px-6">
        <BackLink to="/dashboard/surveys" label={translations("Surveys")} />
        <h1 className={cn(SECTION_TITLE, "truncate")}>{title}</h1>
        <InfoButton docUrl={`${docsPath}/advancedFt/overview`} />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as T)}>
        <TabsList
          variant="line"
          className="h-11.5 w-full justify-start gap-0.5 rounded-none border-b border-border bg-background p-0 px-3"
        >
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-full flex-none gap-1.75 rounded-none border-0 px-3.25 text-[13px] font-medium text-muted-foreground after:bg-primary group-data-horizontal/tabs:after:-bottom-px data-active:font-bold data-active:text-primary"
            >
              <Icon className="size-3.75" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
