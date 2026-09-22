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
      <TabsList className="mb-4">
        {SECTION_TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value}>
            <Icon />
            {translations(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
