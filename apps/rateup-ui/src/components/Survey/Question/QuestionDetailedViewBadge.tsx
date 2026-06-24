import { Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { getTypeLabel } from "@/utils/enums/index.ts";

function QuestionDetailedViewBadge({ question }) {
  const { t: translations } = useTranslation();
  return (
    <Badge
      variant={getTypeLabel(question.type) ? "outline" : "light"}
      size="lg"
      style={{ overflow: "visible" }}
      color={getTypeLabel(question.type) ? "var(--tertiary-color)" : "red"}
    >
      {getTypeLabel(question.type) ? getTypeLabel(question.type) : translations("Not Available")}
    </Badge>
  );
}

export default QuestionDetailedViewBadge;
