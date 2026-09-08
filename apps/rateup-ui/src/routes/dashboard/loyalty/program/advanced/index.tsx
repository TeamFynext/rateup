import { IconArrowLeft } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { EarningRulesPage } from "@/components/dashboard/loyalty/earning-rules/EarningRulesPage.tsx";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { RewardsPage } from "@/components/dashboard/loyalty/rewards/RewardsPage.tsx";
import { Button } from "@/components/ui/button.tsx";

/**
 * The full editors, for the fields the Program sections do not carry yet: date and time
 * windows and tier restrictions on a rule; coupon codes, free gifts, limits and validity
 * on a reward. Reached only from an Advanced disclosure, never from the sidebar.
 */
const searchSchema = z.object({
  section: z.enum(["earning", "rewards"]).catch("rewards"),
});

export const Route = createFileRoute("/dashboard/loyalty/program/advanced/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { section } = Route.useSearch();

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        render={<Link to={LOYALTY_PATHS.program} search={{ section }} />}
      >
        <IconArrowLeft size={16} />
        {t("Back to Program")}
      </Button>
      {section === "earning" ? <EarningRulesPage /> : <RewardsPage />}
    </div>
  );
}
