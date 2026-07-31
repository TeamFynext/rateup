import {
  IconAlignBoxLeftMiddleFilled,
  IconCalendarTime,
  IconCameraFilled,
  IconCaretDownFilled,
  IconClick,
  IconFileFilled,
  IconImageInPicture,
  IconLink,
  IconListCheck,
  IconListDetails,
  IconMoodSmileFilled,
  IconPhoto,
  IconPokerChip,
  IconScaleOutline,
  IconStarsFilled,
  IconTextSize,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  LDResponse2,
  QuestionType2,
  RatingScale,
  SmileyResponse2,
  YNResponse,
} from "@/types/enums.ts";
import { FlowQuestionTypes2 } from "@/utils/constants.ts";

import useFlowStoreV3 from "../utils/store.ts";
import { NO_NAME_TYPES, NO_VISIBLE_TYPES } from "../utils/typeConstants.ts";

import styles from "./AddElementModal.module.css";

// Icon mapping for question types
const questionIcons = {
  [QuestionType2.TextInput]: IconTextSize,
  [QuestionType2.TextArea]: IconAlignBoxLeftMiddleFilled,
  [QuestionType2.CheckboxGroup]: IconListCheck,
  [QuestionType2.RadioButtonsGroup]: IconClick,
  [QuestionType2.Dropdown]: IconCaretDownFilled,
  [QuestionType2.Rating]: IconStarsFilled,
  [QuestionType2.Smiley]: IconMoodSmileFilled,
  [QuestionType2.LD]: IconThumbUpFilled,
  [QuestionType2.YN]: IconPokerChip,
  [QuestionType2.Opinion]: IconScaleOutline,
  [QuestionType2.DatePicker]: IconCalendarTime,
  [QuestionType2.Image]: IconPhoto,
  [QuestionType2.PhotoPicker]: IconCameraFilled,
  [QuestionType2.DocumentPicker]: IconFileFilled,
  [QuestionType2.EmbeddedLink]: IconLink,
  [QuestionType2.ChipsSelector]: IconListDetails,
  [QuestionType2.ImageCarousel]: IconImageInPicture,
  [QuestionType2.TextHeading]: IconTextSize,
  [QuestionType2.TextSubheading]: IconTextSize,
  [QuestionType2.TextBody]: IconTextSize,
  [QuestionType2.TextCaption]: IconTextSize,
  [QuestionType2.OptIn]: IconListCheck,
};

interface AddElementModalProps {
  opened: boolean;
  close: () => void;
}

// Modal for adding new elements to the flow
function AddElementModal({ opened, close }: AddElementModalProps) {
  const { t: translations } = useTranslation();
  const { getCurrentScreen, getScreens, addComponentToScreen } = useFlowStoreV3();

  const getLabel = (type: QuestionType2) => {
    switch (type) {
      case QuestionType2.LD:
        return "Like or Dislike";
      case QuestionType2.YN:
        return "Yes or No";
      default:
        return type;
    }
  };

  const getDefaultDataSource = (type: QuestionType2) => {
    const mapEnumToDataSource = (enumObj: object) =>
      Object.values(enumObj).map((value, index) => ({
        id: (index + 1).toString(),
        title: value,
      }));

    switch (type) {
      case QuestionType2.Rating:
        return Object.entries(RatingScale).map(([description, title], index) => ({
          id: (index + 1).toString(),
          title,
          description,
        }));
      case QuestionType2.Smiley:
        return mapEnumToDataSource(SmileyResponse2);
      case QuestionType2.LD:
        return mapEnumToDataSource(LDResponse2);
      case QuestionType2.YN:
        return mapEnumToDataSource(YNResponse);
      case QuestionType2.Opinion:
        return Array.from({ length: 10 }).map((_, index) => ({
          id: (index + 1).toString(),
          title: (index + 1).toString(),
        }));
      default:
        return [];
    }
  };

  const handleTypeSelection = (type: QuestionType2) => {
    const screen = getCurrentScreen();
    if (!screen) {
      toast.error(translations("Please select a screen first"));
      return;
    }

    const formElementChildren = screen.layout.children;

    // Validation checks
    if (formElementChildren.length > 50) {
      toast.error(translations("Only 50 components allowed in a screen"), {
        id: "error-max-screen-elements",
      });
      return;
    }

    if (
      [QuestionType2.DocumentPicker, QuestionType2.PhotoPicker].includes(type) &&
      formElementChildren.find((c) => c.type === type)
    ) {
      toast.error(`Only one ${type} allowed per screen`, {
        id: "error-max-screen-elements",
      });
      return;
    }

    if (
      [QuestionType2.DocumentPicker, QuestionType2.PhotoPicker].includes(type) &&
      formElementChildren.some((child) =>
        ["DocumentPicker", "PhotoPicker"].includes(child.type ?? ""),
      )
    ) {
      toast.error(
        translations(
          "Using both PhotoPicker and DocumentPicker components on a single screen is not allowed",
        ),
        {
          id: "error-max-screen-elements",
        },
      );
      return;
    }

    if (
      type === QuestionType2.ImageCarousel &&
      formElementChildren.filter((c) => c.type === "ImageCarousel").length >= 2
    ) {
      toast.error(translations("Maximum of 2 ImageCarousel components allowed per screen"), {
        id: "error-max-screen-elements",
      });
      return;
    }

    if (
      type === QuestionType2.ImageCarousel &&
      getScreens()
        .flatMap((screen) => screen.layout.children)
        .filter((child) => child.type === "ImageCarousel").length >= 3
    ) {
      toast.error(translations("Maximum of 3 ImageCarousel components allowed per flow"), {
        id: "error-max-screen-elements",
      });
      return;
    }

    // Create new element with a unique ID
    const id = crypto.randomUUID().replace(/-/g, "_");
    const metaType = Object.keys(QuestionType2).find(
      (k) => QuestionType2[k as keyof typeof QuestionType2] === type,
    );
    const newElement = {
      id,
      type,
      metaType,
      // Only add name/required to interactive (form) types
      ...(!NO_NAME_TYPES.has(type) && { name: id, required: false }),
      // Only add visible to types that support it (Footer and Image types excluded)
      ...(!NO_VISIBLE_TYPES.has(type) && { visible: true }),
    };

    // Add default values based on type
    switch (type) {
      case QuestionType2.TextInput:
        newElement.label = "";
        newElement["input-type"] = "text";
        break;
      case QuestionType2.CheckboxGroup:
      case QuestionType2.RadioButtonsGroup:
        newElement.label = "";
        newElement["data-source"] = [];
        break;
      case QuestionType2.LD:
      case QuestionType2.YN:
        newElement.type = "RadioButtonsGroup";
        newElement.label = "";
        newElement["data-source"] = getDefaultDataSource(type);
        newElement.required = true;
        break;
      case QuestionType2.Rating:
      case QuestionType2.Smiley:
      case QuestionType2.Opinion:
      case QuestionType2.Dropdown:
        newElement.type = "Dropdown";
        newElement.label = "";
        newElement["data-source"] = getDefaultDataSource(type);
        newElement.required = true;
        break;
      case QuestionType2.TextArea:
        newElement.label = "";
        newElement["max-length"] = 600;
        break;
      case QuestionType2.Footer:
        newElement.label = "Continue";
        newElement["on-click-action"] = {
          name: "complete",
          payload: {},
        };
        break;
      default:
        if (type.toString().includes("Text")) {
          newElement.text = "";
        }
    }

    addComponentToScreen(newElement);
    close();
  };

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-4xl max-h-[80vh] min-w-fit">
        <DialogHeader>
          <DialogTitle>{translations("Add Element")}</DialogTitle>
          <DialogDescription>
            {translations("Select an element to add to your flow")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-6">
            {FlowQuestionTypes2.map((group, index) => (
              <div key={index}>
                <h5 className="text-sm font-medium text-muted-foreground mb-3">{group.title}</h5>
                <div className="grid grid-cols-3 gap-3">
                  {group.questionTypes.map((type) => {
                    const Icon = questionIcons[type as keyof typeof questionIcons];
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        className={
                          styles["element-type-button"] +
                          " h-auto py-4 flex flex-col items-center gap-2"
                        }
                        onClick={() => handleTypeSelection(type)}
                      >
                        {Icon && <Icon size={20} />}
                        <span className="text-sm font-medium">{getLabel(type)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default AddElementModal;
