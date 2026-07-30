import { useId } from "react";
import { useTranslation } from "react-i18next";

import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";

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
