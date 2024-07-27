import { Badge } from "@mantine/core";

import { getTypeLabel } from "@/utils/enums";

function QuestionDetailedViewBadge({ question }) {
  return (
    <Badge
      variant={getTypeLabel(question.type) ? "outline" : "light"}
      size="lg"
      style={{ overflow: "visible" }}
      color={getTypeLabel(question.type) ? "var(--tertiary-color)" : "red"}
    >
      {getTypeLabel(question.type)
        ? getTypeLabel(question.type)
        : "Not Available"}
    </Badge>
  );
}

export default QuestionDetailedViewBadge;
