import { useTranslation } from "react-i18next";

import { BackLink } from "@/components/common/back-link.tsx";

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
      <BackLink to={LOYALTY_PATHS.program} search={{}} label={t("Program")} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
