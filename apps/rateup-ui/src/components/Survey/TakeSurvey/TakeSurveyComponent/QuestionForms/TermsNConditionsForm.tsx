import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { FieldLabel } from "@/components/ui/field.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import type { TNC } from "@/types/global";

import { luminance } from "./isLightColor.ts";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function TermsNConditionsForm({ tncData }: { tncData?: Record<string, TNC> }) {
  const [opened, setOpened] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const themePrimaryColor = useThemePrimaryColor();
  const { t: translations } = useTranslation();
  const textColor = luminance(themePrimaryColor) > 0.8 ? "var(--foreground)" : themePrimaryColor;

  const tnc = tncData?.[selectedLanguage] || {
    title: translations("I agree to"),
    urlTitle: translations("terms and conditions"),
    content: "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
  };

  return (
    <>
      <FormPaperLayout>
        <FieldLabel htmlFor="tnc-checkbox" className="flex items-center gap-2 p-3">
          <Checkbox
            id="tnc-checkbox"
            checked={response || false}
            onCheckedChange={(checked) => updateResponse(!!checked)}
            style={{
              borderColor: textColor,
              backgroundColor: response ? textColor : undefined,
            }}
          />
          <span className="-mt-0.5 flex items-center gap-1.5" style={{ color: textColor }}>
            {tnc?.title}
            <a href="#" onClick={() => setOpened(true)} className="underline text-primary">
              {tnc?.urlTitle}
            </a>
          </span>
        </FieldLabel>
      </FormPaperLayout>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Terms & Conditions")}</DialogTitle>
          </DialogHeader>
          <p className="pb-[50px]">{tnc?.content}</p>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                updateResponse(true);
                setOpened(false);
              }}
            >
              {translations("Accept")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
