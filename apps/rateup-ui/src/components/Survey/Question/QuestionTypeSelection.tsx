import {
  IconAddressBook,
  IconAdjustmentsQuestion,
  IconAlignBoxLeftMiddleFilled,
  IconCalendarTime,
  IconCameraFilled,
  IconCaretDownFilled,
  IconCaretUpDown,
  IconCheckbox,
  IconCircuitPushbutton,
  IconClick,
  IconFileFilled,
  IconGridDots,
  IconLink,
  IconList,
  IconListCheck,
  IconListDetails,
  IconMailFilled,
  IconMessageChatbot,
  IconMoodSmileFilled,
  IconNumber123,
  IconPhoneFilled,
  IconPhoto,
  IconScaleOutline,
  IconSquareAsterisk,
  IconStarsFilled,
  IconTextPlus,
  IconTextSize,
  IconThumbUpFilled,
  IconWheel,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionType, WaFlowFormNonInputElementType } from "@/types/enums.ts";
import { googleReviewSupportedTypes } from "@/utils/data.ts";
import { getQuestionTypeLabel } from "@/utils/enums/index.ts";

import { GoogleIcon } from "../../Button/GoogleIcon.tsx";

import classes from "./QuestionDetailedView.module.css";

interface QuestionTypeSelectionProps {
  questionTypeGroups: Array<{
    title: string;
    questionTypes: Array<any>;
  }>;
  handleTypeSelection: (type: QuestionType) => void;
}

export function QuestionTypeSelection({
  questionTypeGroups,
  handleTypeSelection,
}: QuestionTypeSelectionProps) {
  const [IsGoogleReviewSupported, setIsGoogleReviewSupported] = useState(false);

  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
    setIsGoogleReviewSupported(false);
  };
  const { t: translations } = useTranslation();

  const QuestionButton = ({ type }) => {
    const Icon = questionIcons[type];
    return (
      <Button
        key={type}
        size="lg"
        variant="outline"
        className={classes.questionTypeButton}
        onClick={() => handleQuestionTypeClick(type as QuestionType)}
        onMouseOver={() => {
          if (googleReviewSupportedTypes.includes(type)) setIsGoogleReviewSupported(true);
          else setIsGoogleReviewSupported(false);
        }}
        onMouseLeave={() => {
          setIsGoogleReviewSupported(false);
        }}
      >
        <Icon size={"1rem"} />
        <span className="text-sm">{getQuestionTypeLabel(type)}</span>
      </Button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col   gap-4 ">
        {questionTypeGroups?.map((qtype, i) => (
          <div className=" flex flex-col gap-3" key={i}>
            <div className="pl-2 flex items-center justify-between">
              <h4 className="text-base font-medium text-muted-foreground">{qtype?.title}</h4>
              {IsGoogleReviewSupported && i === 0 && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-sm capitalize text-gray-500"
                >
                  <GoogleIcon width={"1rem"} height={"1rem"} />
                  {translations("Review Supported")}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap px-4">
              {qtype?.questionTypes?.map((type, index) => (
                <div className="p-2" key={index}>
                  <QuestionButton type={type} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// TODO: add proper icons
const questionIcons = {
  [QuestionType.Text]: IconTextSize,
  [QuestionType.TextArea]: IconAlignBoxLeftMiddleFilled,
  [QuestionType.Number]: IconNumber123,
  [QuestionType.Email]: IconMailFilled,
  [QuestionType.Phone]: IconPhoneFilled,
  [QuestionType.Photo]: IconCameraFilled,
  [QuestionType.Date]: IconCalendarTime,
  [QuestionType.LD]: IconThumbUpFilled,
  [QuestionType.YN]: IconClick,
  [QuestionType.Rating]: IconStarsFilled,
  [QuestionType.Smiley]: IconMoodSmileFilled,
  [QuestionType.Opinion]: IconScaleOutline,
  [QuestionType.MCQ]: IconListCheck,
  [QuestionType.MSQ]: IconListDetails,
  [QuestionType.Testimonial]: IconMessageChatbot,
  [QuestionType.EmailPhone]: IconAddressBook,
  [QuestionType.DDSS]: IconCaretDownFilled,
  [QuestionType.DDMS]: IconCaretUpDown,
  [QuestionType.CustomNPS]: IconAdjustmentsQuestion,
  [QuestionType.PCQ]: IconAdjustmentsQuestion,
  [QuestionType.Contact]: IconAddressBook,
  [QuestionType.TnC]: IconCheckbox,
  [QuestionType.InfoMessage]: IconMailFilled,
  [QuestionType.MultiTextInput]: IconTextPlus,
  [QuestionType.MCQGrid]: IconGridDots,
  [QuestionType.File]: IconFileFilled,
  [QuestionType.EmailOtp]: IconSquareAsterisk,
  [QuestionType.WOP]: IconWheel,
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
  [QuestionType.WaTimeSlot]: IconCalendarTime,
  [QuestionType.PhotoPicker]: IconCameraFilled,
  [QuestionType.DocumentPicker]: IconFileFilled,
  [WaFlowFormNonInputElementType.nonInputText]: IconTextSize,
  [WaFlowFormNonInputElementType.image]: IconPhoto,
  [WaFlowFormNonInputElementType.embeddedLink]: IconLink,
  [WaFlowFormNonInputElementType.optIn]: IconLink,
};

export { questionIcons };
