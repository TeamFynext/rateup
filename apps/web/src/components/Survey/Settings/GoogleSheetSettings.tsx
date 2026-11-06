import { Card, CardContent, CardHeader, CardTitle } from "@rateup/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@rateup/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@rateup/ui/components/input-group";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { ApiCopyButton } from "@/components/ExternalApi/ApiCopyButton.tsx";

const GoogleSheetSettings = ({ spreadSheetId }: { spreadSheetId: string }) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const url = spreadSheetId ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}` : null;

  if (!url) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations("GoogleSheet")}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${uid}-field`}>{translations("Sheet Url")}</FieldLabel>
            <InputGroup>
              <InputGroupInput id={`${uid}-field`} readOnly value={url} />
              <InputGroupAddon align="inline-end">
                <ApiCopyButton value={url} />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetSettings;
