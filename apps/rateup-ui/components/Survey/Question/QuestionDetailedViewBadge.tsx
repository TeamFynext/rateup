"use client";

import { Badge } from "@mantine/core";
import { useTranslations } from "next-intl";

import { getTypeLabel } from "@/utils/enums";

function QuestionDetailedViewBadge({ question }) {
  const translations = useTranslations();
  return (
    <Badge
      variant={getTypeLabel(question.type) ? "outline" : "light"}
      size="lg"
      style={{ overflow: "visible" }}
      color={getTypeLabel(question.type) ? "var(--tertiary-color)" : "red"}
    >
      {getTypeLabel(question.type)
        ? getTypeLabel(question.type)
        : translations("Not Available")}
    </Badge>
  );
}

export default QuestionDetailedViewBadge;
