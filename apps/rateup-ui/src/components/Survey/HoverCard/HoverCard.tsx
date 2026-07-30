import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { QuestionType } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { extractText, isHtml } from "@/utils/index.ts";

export const HoverCardComponent = ({
  content,
  questionType = null,
}: {
  content: ReactNode;
  questionType?: QuestionType | null;
}) => {
  const { t: translations } = useTranslation();

  if (questionType && !Object.values(QuestionType).includes(questionType))
    return <Badge variant="destructive">{translations("Not Available")}</Badge>;

  const isMultiType = [QuestionType.MultiTextInput, QuestionType.MCQGrid].includes(questionType);
  const isObjectContent = typeof content === "object";

  return (
    <HoverCard>
      <HoverCardTrigger className="cursor-default">
        {isMultiType && content?.length > 0 ? (
          <p className="line-clamp-1 min-w-[200px] max-w-[200px] font-light">{content[0]}</p>
        ) : isObjectContent ? (
          <img
            src={getFileUrlFromKey(content?.value?.image)}
            className="w-[30px]"
            alt={translations("answer image of question")}
          />
        ) : (
          <p className="line-clamp-1 min-w-[200px] max-w-[200px] font-light">
            {getContent(content)}
          </p>
        )}
      </HoverCardTrigger>

      <HoverCardContent className="w-fit max-w-[400px] p-3" side="bottom" align="start">
        <ScrollArea className="max-h-[250px]">
          <div className="break-words font-light">
            {isMultiType ? (
              content?.length > 0 &&
              content?.map((item: string) => (
                <p key={item} className="min-w-[200px] max-w-[200px]">
                  {item}
                </p>
              ))
            ) : isObjectContent ? (
              <>
                <img
                  src={getFileUrlFromKey(content?.value?.image)}
                  className="w-[200px]"
                  alt={translations("answer image of question")}
                />
                <p className="max-w-[200px] truncate">{content?.value?.value}</p>
              </>
            ) : (
              <p className="min-w-[200px]">{getContent(content)}</p>
            )}
          </div>
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};

const getContent = (title: string | boolean) => {
  if (typeof title === "boolean") return title?.toString();
  else if (isHtml(title)) return extractText(title);
  else return title;
};
