import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";

import { LOYALTY_PATHS } from "../paths.ts";

/**
 * One section open, full width: a Back button to the summary cards, then the editor.
 * Each editor carries its own heading, so nothing else sits above it — and there is no
 * rail of other sections, because every section now shows its whole editor and the
 * summary page is one tap away.
 */
export function ProgramSectionEditor({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        render={<Link to={LOYALTY_PATHS.program} search={{}} />}
      >
        <IconArrowLeft size={16} />
        {t("Back to Program")}
      </Button>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
