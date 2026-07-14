import { useCallback, useState } from "react";

import { useLinkTypeOptions } from "@/backend/linktree/linktree.query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import {
  getLinkTypeLabel,
  getSelectedSurveyTitleOptions,
  getSelectedTeamOptions,
  getSurveyTitleWithId,
} from "../../constants.tsx";

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
  const { data: selectLinkTypeOptionsData, isPending: isSelectedLinkTypeOptionsLoading } =
    useLinkTypeOptions(selectedLinkType);

  const [sTAutoCompleteSearchFocused, setSTAutoCompleteSearchFocused] = useState(false);

  const handleSurveyTitleAutoCompleteOnBlur = useCallback(
    (_value) => {
      onSurveyTitleAutoCompleteSearchChange(
        getSurveyTitleWithId(selectLinkTypeOptionsData, selectedSurveyTitle),
      );
      setSTAutoCompleteSearchFocused(false);
    },
    [selectedSurveyTitle],
  );

  let selectedSurveyTitleOptions = getSelectedSurveyTitleOptions(selectLinkTypeOptionsData);
  let selectedTeamOptions = getSelectedTeamOptions(selectLinkTypeOptionsData, selectedSurveyTitle);

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
    selectedTeamOptions = [{ label: "Select survey to select team", value: "", disabled: true }];
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="survey-title-autocomplete">
          {`Select ${getLinkTypeLabel(selectedLinkType)}`}
        </Label>
        <Combobox
          items={selectedSurveyTitleOptions}
          value={selectedSurveyTitle}
          onValueChange={onSurveyTitleDDChange}
          inputValue={surveyTitleAutoCompleteSearch}
          onInputValueChange={onSurveyTitleAutoCompleteSearchChange}
        >
          <ComboboxInput
            id="survey-title-autocomplete"
            placeholder={sTAutoCompleteSearchFocused ? "Search Survey" : "Select Survey"}
            aria-invalid={!!errors?.selectedSurveyTitleErr}
            disabled={isSelectedLinkTypeOptionsLoading}
            onFocus={() => {
              onSurveyTitleAutoCompleteSearchChange("");
              setSTAutoCompleteSearchFocused(true);
            }}
            onClick={() => {
              onSurveyTitleAutoCompleteSearchChange("");
            }}
            onBlur={handleSurveyTitleAutoCompleteOnBlur}
          />
          <ComboboxContent align="start">
            <ComboboxEmpty>No results found.</ComboboxEmpty>
            <ComboboxList>
              {(item: { value: string; label: string; disabled?: boolean }) => (
                <ComboboxItem key={item.value} value={item.value} disabled={item.disabled}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {errors?.selectedSurveyTitleErr && (
          <p className="text-xs text-destructive">{errors.selectedSurveyTitleErr}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="select-team">Select Team</Label>
        <Select
          value={selectedTeam ?? ""}
          onValueChange={onSelectedTeamDDChange}
          items={selectedTeamOptions}
        >
          <SelectTrigger
            id="select-team"
            className="w-full"
            aria-invalid={!!errors?.selectedTeamErr}
          >
            <SelectValue placeholder="Select Team" />
          </SelectTrigger>
          <SelectContent>
            {selectedTeamOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.selectedTeamErr && (
          <p className="text-xs text-destructive">{errors.selectedTeamErr}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ws-link-display-name">Link Display name</Label>
        <Input
          id="ws-link-display-name"
          placeholder="Enter Link Display Name"
          value={linkDisplayName}
          onChange={(e) => onLinkDisplayNameChange(e.target.value)}
          aria-invalid={!!errors?.wsOrWasLinkDisplayNameErr}
        />
        {errors?.wsOrWasLinkDisplayNameErr && (
          <p className="text-xs text-destructive">{errors.wsOrWasLinkDisplayNameErr}</p>
        )}
      </div>
    </>
  );
}

export default SurveyTypeDropdowns;
