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
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PageType,
  QuestionType,
  WaFlowFormElementType,
  WaFlowFormNonInputElementType,
} from "@/types/enums.ts";
import { googleReviewSupportedTypes } from "@/utils/data.ts";
import { getQuestionTypeLabel, getTypeLabel } from "@/utils/enums/index.ts";

import { GoogleIcon } from "../../Button/GoogleIcon.tsx";
import { pageIcons } from "../Page/PageIcons.ts";

export type ElementType =
  | QuestionType
  | PageType
  | WaFlowFormElementType
  | WaFlowFormNonInputElementType;

interface ElementTypeChipProps {
  type: ElementType;
  disabled?: boolean;
  onClick: () => void;
  onMouseOver?: () => void;
  onMouseLeave?: () => void;
}

/**
 * A single pickable element in the "Add Element" list: coloured type tile + label.
 * Shared by the question and page groups so both read as one catalogue.
 */
export function ElementTypeChip({
  type,
  disabled = false,
  onClick,
  onMouseOver,
  onMouseLeave,
}: Readonly<ElementTypeChipProps>) {
  const Icon =
    pageIcons[type as keyof typeof pageIcons] ?? questionIcons[type as keyof typeof questionIcons];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onFocus={onMouseOver}
      onMouseLeave={onMouseLeave}
      onBlur={onMouseLeave}
      className={cn(
        "flex items-center gap-2.25 rounded-[10px] border border-border bg-card py-2.25 pr-3.5 pl-2.25 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary hover:bg-primary/10 hover:shadow-xs",
      )}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: questionTypeColors[type] ?? "var(--primary)" }}
      >
        {Icon && <Icon size={15} strokeWidth={2} />}
      </span>
      <span className="whitespace-nowrap text-[13px] font-semibold text-foreground">
        {getTypeLabel(type as QuestionType | PageType)}
      </span>
    </button>
  );
}

/** Uppercase group heading used across the element catalogue. */
export function ElementGroupTitle({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </div>
  );
}

interface QuestionTypeSelectionProps {
  questionTypeGroups: Array<{
    title: string;
    questionTypes: Array<any>;
  }>;
  handleTypeSelection: (type: ElementType) => void;
  /** Optional filter text coming from the "Add Element" search box. */
  query?: string;
}

export function QuestionTypeSelection({
  questionTypeGroups,
  handleTypeSelection,
  query = "",
}: Readonly<QuestionTypeSelectionProps>) {
  // The hovered type, so the "Review Supported" hint shows on its own group's
  // header instead of always on the first group's.
  const [hoveredType, setHoveredType] = useState<QuestionType | null>(null);

  const handleQuestionTypeClick = (type: ElementType) => {
    handleTypeSelection(type);
    setHoveredType(null);
  };
  const { t: translations } = useTranslation();

  const needle = query.trim().toLowerCase();
  const visibleGroups = (questionTypeGroups ?? [])
    .map((group) => ({
      ...group,
      questionTypes: needle
        ? group?.questionTypes?.filter((type) =>
            String(getQuestionTypeLabel(type) || "")
              .toLowerCase()
              .includes(needle),
          )
        : group?.questionTypes,
    }))
    .filter((group) => group?.questionTypes?.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {visibleGroups.map((qtype, i) => (
        <div className="flex flex-col gap-2.5" key={qtype?.title ?? i}>
          {/* Fixed height so the hover badge appearing never reflows the chips below. */}
          <div className="flex h-5 items-center justify-between">
            <ElementGroupTitle>{translations(qtype?.title)}</ElementGroupTitle>
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-1 rounded-md px-1.5 text-[11px] font-medium capitalize transition-opacity",
                qtype?.questionTypes?.includes(hoveredType) &&
                  hoveredType &&
                  googleReviewSupportedTypes.includes(hoveredType)
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
              )}
            >
              <GoogleIcon width={"0.75rem"} height={"0.75rem"} />
              {translations("Review Supported")}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {qtype?.questionTypes?.map((type) => (
              <ElementTypeChip
                key={type}
                type={type}
                onClick={() => handleQuestionTypeClick(type as QuestionType)}
                onMouseOver={() => setHoveredType(type)}
                onMouseLeave={() => setHoveredType(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Tile colour behind each element's icon. Brand-specific one-offs, so they stay
 * literal hex consumed as a dynamic `style` value.
 */
const questionTypeColors: Record<string, string> = {
  // Page types
  [PageType.Welcome]: "#3B82F6",
  [PageType.ThankYou]: "#3B82F6",
  [PageType.Language]: "#6366F1",
  [PageType.Custom]: "#14B8A6",
  [PageType.GoogleReview]: "#EF4444",
  // Question types
  [QuestionType.Text]: "#8B5CF6",
  [QuestionType.TextArea]: "#EC4899",
  [QuestionType.Number]: "#F59E0B",
  [QuestionType.Email]: "#3B82F6",
  [QuestionType.Phone]: "#10B981",
  [QuestionType.Photo]: "#6366F1",
  [QuestionType.Date]: "#06B6D4",
  [QuestionType.LD]: "#14B8A6",
  [QuestionType.YN]: "#10B981",
  [QuestionType.Rating]: "#22C55E",
  [QuestionType.Smiley]: "#EAB308",
  [QuestionType.Opinion]: "#F97316",
  [QuestionType.MCQ]: "#6366F1",
  [QuestionType.MSQ]: "#8B5CF6",
  [QuestionType.CustomNPS]: "#F97316",
  [QuestionType.PCQ]: "#A855F7",
  [QuestionType.Testimonial]: "#10B981",
  [QuestionType.EmailPhone]: "#3B82F6",
  [QuestionType.DDSS]: "#64748B",
  [QuestionType.DDMS]: "#64748B",
  [QuestionType.Contact]: "#14B8A6",
  [QuestionType.TnC]: "#EF4444",
  [QuestionType.InfoMessage]: "#0EA5E9",
  [QuestionType.MultiTextInput]: "#7C3AED",
  [QuestionType.MCQGrid]: "#6366F1",
  [QuestionType.File]: "#78716C",
  [QuestionType.EmailOtp]: "#EF4444",
  [QuestionType.WOP]: "#F97316",
  [QuestionType.WaList]: "#22C55E",
  [QuestionType.WaButtons]: "#3B82F6",
  [QuestionType.WaTimeSlot]: "#06B6D4",
  [QuestionType.PhotoPicker]: "#6366F1",
  [QuestionType.DocumentPicker]: "#78716C",
};

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

export { questionIcons, questionTypeColors };
