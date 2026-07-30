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
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
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
}: {
  selectedLinkType: string;
  selectedSurveyTitle: string;
  onSurveyTitleDDChange: (value: string) => void;
  surveyTitleAutoCompleteSearch: string;
  onSurveyTitleAutoCompleteSearchChange: (value: string) => void;
  linkDisplayName: string;
  onLinkDisplayNameChange: (value: string) => void;
  selectedTeam: string;
  onSelectedTeamDDChange: (value: string) => void;
  errors?: Record<string, string>;
}) {
  const { data: selectLinkTypeOptionsData, isPending: isSelectedLinkTypeOptionsLoading } =
    useLinkTypeOptions(selectedLinkType);

  const [sTAutoCompleteSearchFocused, setSTAutoCompleteSearchFocused] = useState(false);

  const handleSurveyTitleAutoCompleteOnBlur = useCallback(
    (_event?: unknown) => {
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
      <Field>
        <FieldLabel htmlFor="survey-title-autocomplete">
          {`Select ${getLinkTypeLabel(selectedLinkType)}`}
        </FieldLabel>
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
      </Field>

      <Field>
        <FieldLabel htmlFor="select-team">Select Team</FieldLabel>
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
      </Field>

      <Field>
        <FieldLabel htmlFor="ws-link-display-name">Link Display name</FieldLabel>
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
      </Field>
    </>
  );
}

export default SurveyTypeDropdowns;
