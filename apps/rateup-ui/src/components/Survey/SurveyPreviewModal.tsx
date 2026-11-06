import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button.tsx";

function SurveyPreviewModal({
  opened,
  onClose,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!opened) return null;

  return (
    <div className="absolute inset-0 max-h-[900px] rounded-2xl p-4 [&_.edit-page-theme-btn]:!hidden [&_.survey-editor-page-header]:hidden [&_.theme-preview-container]:shadow-none">
      <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-[0_1px_0_rgba(0,0,0,0.05),0_0_8px_rgba(0,0,0,0.11)]">
        <Button
          aria-label="Close"
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 z-[100] rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <IconX />
        </Button>
        <div className="flex h-full flex-col items-center px-10 py-4">
          <div className="h-full w-full max-w-[1200px]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default SurveyPreviewModal;
