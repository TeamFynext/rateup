import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { PageType, QuestionType } from "@/types/enums.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { extractText, isHtml } from "@/utils/index.ts";

export const HoverCardComponent = ({
  content,
  questionType = null,
}: {
  /** Either a rendered node, a list of answers, or a single choice object. */
  content: ReactNode | string[] | { value?: { image?: string; value?: string } };
  questionType?: QuestionType | PageType | null;
}) => {
  const { t: translations } = useTranslation();

  const knownTypes: Array<QuestionType | PageType> = Object.values(QuestionType);
  if (questionType && !knownTypes.includes(questionType))
    return <Badge variant="destructive">{translations("Not Available")}</Badge>;

  const multiTypes: Array<QuestionType | PageType> = [
    QuestionType.MultiTextInput,
    QuestionType.MCQGrid,
  ];
  const isMultiType = questionType ? multiTypes.includes(questionType) : false;
  const isObjectContent = typeof content === "object";

  // The three render branches below are selected by question type and runtime
  // shape, which TypeScript cannot follow through those flags; these are the
  // corresponding views of `content`.
  const listContent = content as string[];
  const choiceContent = content as { value?: { image?: string; value?: string } };
  const textContent = content as string;

  return (
    <HoverCard>
      <HoverCardTrigger className="cursor-default">
        {isMultiType && listContent?.length > 0 ? (
          <p className="line-clamp-1 min-w-[200px] max-w-[200px] font-light">{listContent[0]}</p>
        ) : isObjectContent ? (
          <img
            src={getFileUrlFromKey(choiceContent?.value?.image ?? "")}
            className="w-[30px]"
            alt={translations("answer image of question")}
          />
        ) : (
          <p className="line-clamp-1 min-w-[200px] max-w-[200px] font-light">
            {getContent(textContent)}
          </p>
        )}
      </HoverCardTrigger>

      <HoverCardContent className="w-fit max-w-[400px] p-3" side="bottom" align="start">
        <ScrollArea className="max-h-[250px]">
          <div className="break-words font-light">
            {isMultiType ? (
              listContent?.length > 0 &&
              listContent?.map((item: string) => (
                <p key={item} className="min-w-[200px] max-w-[200px]">
                  {item}
                </p>
              ))
            ) : isObjectContent ? (
              <>
                <img
                  src={getFileUrlFromKey(choiceContent?.value?.image ?? "")}
                  className="w-[200px]"
                  alt={translations("answer image of question")}
                />
                <p className="max-w-[200px] truncate">{choiceContent?.value?.value}</p>
              </>
            ) : (
              <p className="min-w-[200px]">{getContent(textContent)}</p>
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
