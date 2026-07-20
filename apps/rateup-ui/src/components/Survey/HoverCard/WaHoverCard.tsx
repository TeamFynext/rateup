import { useTranslation } from "react-i18next";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { WaQuestions } from "@/types/enums.ts";

export const WaHoverCardComponent = ({ content, type }) => {
  const { t: translations } = useTranslation();

  return (
    <HoverCard>
      <HoverCardTrigger className="cursor-default">
        {type === WaQuestions.PhotoPicker ? (
          <img
            src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${content}`}
            className="h-[40px] w-[30px] object-cover"
            loading="lazy"
            alt={translations("answer image of question")}
          />
        ) : (
          <p className="line-clamp-1 min-w-[200px] max-w-[200px] font-light">{content}</p>
        )}
      </HoverCardTrigger>

      <HoverCardContent className="w-fit max-w-[400px] p-3" side="bottom" align="start">
        <ScrollArea className="max-h-[250px]">
          {type === WaQuestions.PhotoPicker ? (
            <img
              src={`${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${content}`}
              className="w-[200px]"
              loading="lazy"
              alt={translations("answer image of question")}
            />
          ) : (
            <div className="min-w-[200px] break-words font-light">
              <p>{content}</p>
            </div>
          )}
        </ScrollArea>
      </HoverCardContent>
    </HoverCard>
  );
};
