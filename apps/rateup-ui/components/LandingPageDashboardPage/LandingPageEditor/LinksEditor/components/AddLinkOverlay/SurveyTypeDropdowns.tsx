import { Combobox, Loader } from "@mantine/core";
import {
  getLinkTypeLabel,
  getSelectedSurveyTitleOptions,
  getSelectedTeamOptions,
  getSurveyTitleWithId,
} from "../../constants";
import { useLinkTypeOptions } from "../../../../../../backend/landingPage/landingPage.query";
import { useCallback, useEffect, useState } from "react";
import {
  ContainedSelection,
  ContainedTextField,
} from "../../../../../input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../../../../input/TeamSelector";

function SurveyTypeDropdowns({
  selectedLinkType,
  selectedSurveyTitle,
  onSurveyTitleDDChange,
  surveyTitleAutoCompleteSearch,
  onSurveyTitleAutoCompleteSearchChange,
  linkDisplayName,
  onLinkDisplayNameChange,
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
      onSurveyTitleAutoCompleteSearchChange(
        getSurveyTitleWithId(selectLinkTypeOptionsData, selectedSurveyTitle),
      );
      setSTAutoCompleteSearchFocused(false);
    },
    [selectedSurveyTitle],
  );

  let selectedSurveyTitleOptions = getSelectedSurveyTitleOptions(
    selectLinkTypeOptionsData,
  );
  let selectedTeamOptions = getSelectedTeamOptions(
    selectLinkTypeOptionsData,
    selectedSurveyTitle,
  );

  if (!selectedSurveyTitleOptions?.length) {
    selectedSurveyTitleOptions = [
      {
        label: `There are No ${getLinkTypeLabel(selectedLinkType)}s`,
        value: "",
        disabled: true,
      },
    ];
  }

  if (!selectedTeamOptions?.length) {
    selectedTeamOptions = [
      { label: "Select survey to select team", value: "", disabled: true },
    ];
  }

  return (
    <>
      <ContainedSelection
        value={surveyTitleAutoCompleteSearch}
        onChange={onSurveyTitleAutoCompleteSearchChange}
        data={selectedSurveyTitleOptions}
        label={`Select ${getLinkTypeLabel(selectedLinkType)}`}
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

      <TeamSelector
        label={"Select Team"}
        value={selectedTeam}
        onChange={onSelectedTeamDDChange}
        data={selectedTeamOptions}
        placeholder="Select Team"
        allowDeselect={false}
        error={errors?.selectedTeamErr}
        withAsterisk
      />

      <ContainedTextField
        label={"Link Display name"}
        placeholder="Enter Link Display Name"
        value={linkDisplayName}
        onChange={(e) => onLinkDisplayNameChange(e.target.value)}
        withAsterisk
        error={errors?.wsOrWasLinkDisplayNameErr}
      />
    </>
  );
}

export default SurveyTypeDropdowns;
