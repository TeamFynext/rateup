import { IconCopy, IconGrid3x3, type TablerIcon } from "@tabler/icons-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

type SurveySection = "surveys" | "templates" | "testimonial";

const SECTION_ROUTES: Record<SurveySection, string> = {
  surveys: "/dashboard/surveys",
  templates: "/dashboard/surveys/templates",
  testimonial: "/dashboard/testimonial",
};

const ALL_SECTION_TABS: { value: SurveySection; label: string; icon: TablerIcon }[] = [
  { value: "surveys", label: "Surveys", icon: IconGrid3x3 },
  { value: "templates", label: "Templates", icon: IconCopy },
  // { value: "testimonial", label: "Testimonial", icon: Star }, // not required for now
];

const hiddenModules = (import.meta.env.VITE_HIDDEN_MODULES as string | undefined)?.split(",") ?? [];

const SECTION_TABS = ALL_SECTION_TABS.filter(
  (tab) => tab.value !== "testimonial" || !hiddenModules.includes("testimonial"),
);

export default function SurveySectionTabs() {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const activeSection: SurveySection = pathname.startsWith("/dashboard/surveys/templates")
    ? "templates"
    : pathname.startsWith("/dashboard/testimonial")
      ? "testimonial"
      : "surveys";

  return (
    <Tabs
      value={activeSection}
      onValueChange={(value) => navigate({ to: SECTION_ROUTES[value as SurveySection] })}
    >
      <TabsList
        variant="line"
        className="mb-4"
        // className="h-auto w-full justify-start gap-0 rounded-none border-b border-ink-100 bg-white p-0 px-[22px]"
      >
        {SECTION_TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="after:bg-rateup-blue-4 data-active:font-semibold data-active:text-rateup-blue-4"
            // className="h-[42px] flex-none gap-[6px] rounded-none border-0 px-4 text-[14px] font-medium text-ink-500 after:bottom-[-1px] after:bg-rateup-blue-4 data-active:font-semibold data-active:text-rateup-blue-4"
          >
            <Icon className="size-3.5" />
            {translations(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
