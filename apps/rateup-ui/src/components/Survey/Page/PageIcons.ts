import {
  IconBrandGoogle,
  IconFileInfo,
  IconLanguage,
  IconNotebook,
  IconPageBreak,
} from "@tabler/icons-react";

import { PageType } from "@/types/enums.ts";

export const pageIcons = {
  [PageType.Welcome]: IconNotebook,
  [PageType.Custom]: IconFileInfo,
  [PageType.ThankYou]: IconPageBreak,
  [PageType.Language]: IconLanguage,
  [PageType.GoogleReview]: IconBrandGoogle,
};
