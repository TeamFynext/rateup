import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { getTypeLabel } from "@/utils/enums/index.ts";

function QuestionDetailedViewBadge({ question }) {
  const { t: translations } = useTranslation();
  const label = getTypeLabel(question.type);

  return label ? (
    <Badge
      variant="outline"
      className="overflow-visible border-[var(--tertiary-color)] text-[var(--tertiary-color)]"
    >
      {label}
    </Badge>
  ) : (
    <Badge variant="destructive" className="overflow-visible">
      {translations("Not Available")}
    </Badge>
  );
}

export default QuestionDetailedViewBadge;
