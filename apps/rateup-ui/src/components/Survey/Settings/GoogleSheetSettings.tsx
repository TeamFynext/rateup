"use client";

import { useTranslation } from "react-i18next";

import { ApiCopyButton } from "@/components/ExternalApi/ApiAccessKey.tsx";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput.tsx";

import PaperLayout from "../../styled/Layouts/PaperLayout.tsx";

const GoogleSheetSettings = ({ spreadSheetId }) => {
  const { t: translations } = useTranslation();
  const url = spreadSheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadSheetId}`
    : null;
  return url ? (
    <PaperLayout className={`section-div`}>
      <h2 className={"settings-section-heading"}>
        {translations("GoogleSheet")}
      </h2>
      <ContainedTextField
        rightSection={<ApiCopyButton value={url} />}
        label={translations("Sheet Url")}
        value={url}
        readOnly
      />
    </PaperLayout>
  ) : null;
};

export default GoogleSheetSettings;
