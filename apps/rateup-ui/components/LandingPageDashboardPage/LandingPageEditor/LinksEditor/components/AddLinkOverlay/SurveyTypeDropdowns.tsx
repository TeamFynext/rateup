import { Autocomplete, Combobox, Loader, Select } from "@mantine/core";
import styles from "./AddLinkOverlay.module.css";
import {
  getLinkTypeLabel,
  getSelectedSurveyTitleOptions,
  getSelectedTeamOptions,
} from "../../constants";
import { useLinkTypeOptions } from "../../../../../../backend/landingPage/landingPage.query";
import { useCallback, useEffect, useState } from "react";

function SurveyTypeDropdowns({
  selectedLinkType,
  selectedSurveyTitle,
  onSurveyTitleDDChange,
  surveyTitleAutoCompleteSearch,
  onSurveyTitleAutoCompleteSearchChange,
  selectedTeam,
  onSelectedTeamDDChange,
  errors,
}) {
  const {
    data: selectLinkTypeOptionsData,
    isPending: isSelectedLinkTypeOptionsLoading,
  } = useLinkTypeOptions(selectedLinkType);

  const [sTAutoCompleteSearchFocused, setSTAutoCompleteSearchFocused] =
    useState(false);

  const handleSurveyTitleAutoCompleteOnBlur = useCallback(
    (value) => {
      onSurveyTitleAutoCompleteSearchChange(selectedSurveyTitle);
      setSTAutoCompleteSearchFocused(false);
    },
    [selectedSurveyTitle],
  );

  return (
    <>
      <Autocomplete
        value={surveyTitleAutoCompleteSearch}
        onChange={onSurveyTitleAutoCompleteSearchChange}
        data={getSelectedSurveyTitleOptions(selectLinkTypeOptionsData)}
        label={`Select ${getLinkTypeLabel(selectedLinkType)} Link`}
        rightSection={
          isSelectedLinkTypeOptionsLoading ? (
            <Loader size={"xs"} />
          ) : (
            <Combobox.Chevron />
          )
        }
        placeholder={
          sTAutoCompleteSearchFocused ? "Search Survey" : "Select Survey"
        }
        onOptionSubmit={onSurveyTitleDDChange}
        onBlur={handleSurveyTitleAutoCompleteOnBlur}
        onFocus={() => {
          onSurveyTitleAutoCompleteSearchChange("");
          setSTAutoCompleteSearchFocused(true);
        }}
        onClick={() => {
          onSurveyTitleAutoCompleteSearchChange("");
        }}
        error={errors?.selectedSurveyTitleErr}
        withAsterisk
      />

      <Select
        label={"Select Team"}
        value={selectedTeam}
        onChange={onSelectedTeamDDChange}
        data={getSelectedTeamOptions(
          selectLinkTypeOptionsData,
          selectedSurveyTitle,
        )}
        placeholder="Select Team"
        allowDeselect={false}
        error={errors?.selectedTeamErr}
        withAsterisk
      />
    </>
  );
}

export default SurveyTypeDropdowns;
