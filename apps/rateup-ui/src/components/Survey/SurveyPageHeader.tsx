import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import InfoButton from "@/components/Button/InfoButton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { docsPath } from "@/utils/constants.ts";

export interface SurveyHeaderTab<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
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
  const navigate = useNavigate();
  const { t: translations } = useTranslation();

  return (
    <div className="flex-shrink-0 bg-white">
      <div className="flex h-[62px] items-center gap-4 border-b border-ink-100 px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/dashboard/surveys" })}
          className="gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 text-[13px] font-semibold text-rateup-blue-4 hover:bg-blue-100"
        >
          <ArrowLeft className="size-3.5" />
          {translations("Back")}
        </Button>
        <h1 className="truncate font-nunito text-[22px] font-extrabold tracking-tight text-ink-900">
          {title}
        </h1>
        <InfoButton docUrl={`${docsPath}/advancedFt/overview`} />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as T)}>
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-b border-ink-100 bg-white p-0 px-[26px]"
        >
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-[46px] flex-none gap-[6px] rounded-none border-0 px-[15px] text-[13px] font-medium text-ink-500 after:bottom-[-1px] after:bg-rateup-blue-4 data-active:font-semibold data-active:text-rateup-blue-4"
            >
              <Icon className="size-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
