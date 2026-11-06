import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { PhoneFrame } from "@/components/ui/phone-preview.tsx";
import { FlowScreenSheetView } from "@/components/whatsapp/flow-v2/Preview/WhatsAppPreview.tsx";
import { readEditorScreens } from "@/components/whatsapp/flow-v2/utils/flow-json.ts";
import type { WaFlowJson } from "@/types/global";

/**
 * A flow JSON on a phone, without opening it in the editor. Key the component by the
 * draft so a different draft starts on its first screen again.
 */
export function FlowTemplatePreview({ json }: Readonly<{ json: WaFlowJson }>) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // The same normalisation the editor applies on load, so the sheet's switch on
  // `type || metaType` sees both fields on every element.
  const screens = useMemo(
    () =>
      readEditorScreens(json).map((screen) => ({
        ...screen,
        layout: {
          ...screen.layout,
          children: (screen.layout.children || []).map((element) => ({
            ...element,
            metaType: element.metaType || element.type,
          })),
        },
      })),
    [json],
  );

  const total = screens.length;
  const current = Math.min(index, Math.max(0, total - 1));

  return (
    <div className="flex flex-col items-center gap-3">
      <PhoneFrame>
        <FlowScreenSheetView screen={screens[current]} />
      </PhoneFrame>
      {total > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Previous screen")}
            disabled={current === 0}
            onClick={() => setIndex(current - 1)}
          >
            <IconChevronLeft size={16} />
          </Button>
          <span className="tabular-nums">
            {t("Screen {n} of {total}", { n: current + 1, total })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Next screen")}
            disabled={current >= total - 1}
            onClick={() => setIndex(current + 1)}
          >
            <IconChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
