import { useTranslation } from "react-i18next";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

import { elementsToBeTranslated } from "./constants.ts";
import EditTranslations from "./EditTranslations/index.tsx";

function UiTextTranslationsModal({
  opened,
  onClose,
  survey,
}: {
  opened: boolean;
  onClose: () => void;
  survey: Survey;
}) {
  const lanugages = survey?.languages;
  const uiTextTranslations = survey?.uiTextTranslations;
  const { t: translations } = useTranslation();

  return (
    <Dialog
      open={opened}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl p-0">
        <DialogHeader className="px-6 pb-4 pt-6">
          <DialogTitle className="w-full text-center text-lg font-bold">
            {translations("UI Text Translations")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 px-6 pb-6">
          {elementsToBeTranslated.map((elementObj) => (
            <EditTranslations
              key={elementObj?.id}
              element={elementObj}
              uiTextTranslations={uiTextTranslations ?? {}}
              languages={lanugages}
              survey={survey}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UiTextTranslationsModal;
