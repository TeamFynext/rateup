"use client";

import { Badge } from "@mantine/core";
import { useExtracted } from "next-intl";

import { getTypeLabel } from "@/utils/enums";

function QuestionDetailedViewBadge({ question }) {
  const translations = useExtracted();
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
