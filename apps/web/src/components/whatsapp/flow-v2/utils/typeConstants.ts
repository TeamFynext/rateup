import { QuestionType2, WaQuestions } from "@/types/enums.ts";

/**
 * Generate a mapping from QuestionType2 display names to WaQuestions API type names.
 * e.g., "Text Heading" → "TextHeading", "Multiple Select" → "CheckboxGroup"
 */
export function getQuestionTypeMapping(): Record<string, string> {
  const mapping: Record<string, string> = {};

  Object.keys(QuestionType2).forEach((key) => {
    const displayName = QuestionType2[key as keyof typeof QuestionType2];
    const typeName = WaQuestions[key as keyof typeof WaQuestions];
    if (displayName && typeName) {
      mapping[displayName] = typeName;
    }
  });

  return mapping;
}

/**
 * Interactive form element types (WaQuestions API names) that require a 'name'
 * field in WhatsApp Flow JSON. All other element types must NOT include 'name'.
 */
export const REQUIRES_NAME_TYPES: string[] = [
  WaQuestions.OptIn,
  WaQuestions.ChipsSelector,
  WaQuestions.TextInput,
  WaQuestions.TextArea,
  WaQuestions.DatePicker,
  WaQuestions.Dropdown,
  WaQuestions.CheckboxGroup,
  WaQuestions.RadioButtonsGroup,
  WaQuestions.PhotoPicker,
  WaQuestions.DocumentPicker,
  // EmbeddedLink does NOT accept 'name' per WA spec (uses on-click-action.url)
];

/**
 * Types that must NOT receive a 'name' field in WhatsApp Flow JSON.
 * Contains both WaQuestions API names (post-mapping) and QuestionType2 display
 * names (pre-mapping) to handle all states of the serialization pipeline.
 *
 * Non-interactive elements: text, image, carousel, embedded links, footer.
 */
export const NO_NAME_TYPES = new Set<string>([
  // WaQuestions API type names (after type mapping)
  WaQuestions.TextHeading,
  WaQuestions.TextSubheading,
  WaQuestions.TextBody,
  WaQuestions.TextCaption,
  WaQuestions.RichText,
  WaQuestions.Image,
  WaQuestions.EmbeddedLink,
  WaQuestions.Footer,
  WaQuestions.ImageCarousel,
  // QuestionType2 display names (before type mapping)
  QuestionType2.TextHeading,
  QuestionType2.TextSubheading,
  QuestionType2.TextBody,
  QuestionType2.TextCaption,
  QuestionType2.RichText,
  QuestionType2.Image,
  QuestionType2.EmbeddedLink,
  QuestionType2.ImageCarousel,
  QuestionType2.Footer,
]);

/**
 * Types that do NOT support 'visible' or 'required' fields in WhatsApp Flow JSON.
 * Contains both WaQuestions API names and QuestionType2 display names to handle
 * both pre- and post-mapping states of the data pipeline.
 *
 * Per WA spec: Image, ImageCarousel, and Footer do not accept these fields.
 */
export const NO_VISIBLE_TYPES = new Set<string>([
  // WaQuestions API type names
  WaQuestions.Image,
  WaQuestions.Footer,
  WaQuestions.ImageCarousel,
  // QuestionType2 display names
  QuestionType2.Image,
  QuestionType2.ImageCarousel,
  QuestionType2.Footer,
]);
