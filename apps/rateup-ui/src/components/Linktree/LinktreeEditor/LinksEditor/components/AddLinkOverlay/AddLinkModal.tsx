import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { linkTypeOptions } from "../../constants.tsx";
import type { LinktreeLink } from "../LinkCard.tsx";
import CustomLinkInputs from "./CustomLinkInputs.tsx";
import SurveyTypeDropdowns from "./SurveyTypeDropdowns.tsx";

import styles from "./AddLinkModal.module.css";

const customLinkFormSchema = z.object({
  linkDisplayName: z.string().min(1, "Link dispaly name is required."),
  linkUrl: z
    .string()
    .min(1, "Link url is required.")
    .refine(
      (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid url" },
    ),
});

export type CustomLinkFormValues = z.infer<typeof customLinkFormSchema>;

/** Per-field validation messages for the add-link form. */
interface AddLinkErrors {
  selectedSurveyTitleErr?: string;
  selectedTeamErr?: string;
  wsOrWasLinkDisplayNameErr?: string;
  [key: string]: string | undefined;
}

function AddLinkModal({
  title,
  opened,
  onClose,
  links,
}: {
  title: string;
  opened: boolean;
  onClose: () => void;
  links: LinktreeLink[];
}) {
  const queryClient = useQueryClient();

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  // SurveyTypeDropdowns states
  const [selectedLinkType, setSelectedLinkType] = useState("web-survey");
  const [surveyTitleAutoCompleteSearch, setSurveyTitleAutoCompleteSearch] = useState("");
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  // Web Survey or Whatsapp Survey Link Display name.
  const [wsOrWasLinkDisplayName, setWsOrWasLinkDisplayName] = useState("");
  const [dropdownErrors, setDropdownErrors] = useState({
    selectedSurveyTitleErr: "",
    selectedTeamErr: "",
    wsOrWasLinkDisplayNameErr: "",
  });

  // CustomLinkInputs form
  const customLinksInputsForm = useForm<CustomLinkFormValues>({
    resolver: zodResolver(customLinkFormSchema),
    defaultValues: {
      linkDisplayName: "",
      linkUrl: "",
    },
  });

  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);

  const handleSelectedLinkTypeDropdownChange = useCallback(
    (value: string) => {
      if (selectedLinkType === "custom-link") {
        queryClient.setQueryData(["linktype-options", selectedLinkType], null);
      }
      setSelectedLinkType(value);
      setDropdownErrors({
        selectedSurveyTitleErr: "",
        selectedTeamErr: "",
        wsOrWasLinkDisplayNameErr: "",
      });
    },
    [selectedLinkType],
  );

  const validateDropdownValues = useCallback(() => {
    let isValid = true;
    const newErrState: AddLinkErrors = {};
    if (selectedSurveyTitle) {
      newErrState["selectedSurveyTitleErr"] = "";
    } else if (!selectedSurveyTitle) {
      isValid = false;
      newErrState["selectedSurveyTitleErr"] = "This field is required.";
    }
    if (selectedTeam) {
      newErrState["selectedTeamErr"] = "";
    } else if (!selectedTeam) {
      isValid = false;
      newErrState["selectedTeamErr"] = "This field is required";
    }
    if (wsOrWasLinkDisplayName) {
      newErrState["wsOrWasLinkDisplayNameErr"] = "";
    } else if (!wsOrWasLinkDisplayName) {
      isValid = false;
      newErrState["wsOrWasLinkDisplayNameErr"] = "This field is required";
    }
    // @ts-ignore
    setDropdownErrors(newErrState);
    return isValid;
  }, [selectedLinkType, selectedSurveyTitle, selectedTeam, wsOrWasLinkDisplayName, dropdownErrors]);

  const onAddBtnClick = useCallback(async () => {
    if (selectedLinkType !== "custom-link") {
      const isDropdownValuesValid = validateDropdownValues();
      if (isDropdownValuesValid) {
        // selectedTeam value is shortUrlId of selected team.
        const linkTypeInUrl = selectedLinkType === "web-survey" ? "ws" : "was";
        const linkDisplayName = wsOrWasLinkDisplayName;
        let linkUrl = `${import.meta.env.VITE_FRONTEND_URL}/${linkTypeInUrl}/${selectedTeam}`;
        if (selectedTeam.length > 8) {
          linkUrl = `${import.meta.env.VITE_FRONTEND_URL}/public/survey/${selectedTeam}`;
        }
        const reqBody = {
          shortUrlId,
          links: [
            ...links,
            {
              id: uuidv4(),
              linkDisplayName,
              linkUrl,
            },
          ],
        };
        await updateLinktreeMutation.mutateAsync(reqBody);
        onClose();
      }
    } else {
      const isCustomInputsValid = await customLinksInputsForm.trigger();
      if (isCustomInputsValid) {
        const reqBody = {
          shortUrlId,
          links: [
            ...links,
            {
              id: uuidv4(),
              ...customLinksInputsForm.getValues(),
            },
          ],
        };
        await updateLinktreeMutation.mutateAsync(reqBody);
        onClose();
      }
    }
  }, [selectedLinkType, selectedSurveyTitle, selectedTeam, customLinksInputsForm]);

  useEffect(() => {
    setSelectedSurveyTitle("");
    setSurveyTitleAutoCompleteSearch("");
    setWsOrWasLinkDisplayName("");
  }, [selectedLinkType]);

  useEffect(() => {
    setSelectedTeam("");
  }, [selectedSurveyTitle]);

  useEffect(() => {
    if (
      dropdownErrors.selectedSurveyTitleErr ||
      dropdownErrors.selectedTeamErr ||
      dropdownErrors.wsOrWasLinkDisplayNameErr
    ) {
      validateDropdownValues();
    }
  }, [selectedSurveyTitle, selectedTeam, wsOrWasLinkDisplayName]);

  return (
    <Dialog
      open={opened}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className={styles["body"]}>
          <Field>
            <FieldLabel htmlFor="link-type">Select Link type</FieldLabel>
            <Select
              value={selectedLinkType}
              onValueChange={(value) => handleSelectedLinkTypeDropdownChange(value ?? "")}
              items={linkTypeOptions}
            >
              <SelectTrigger id="link-type" className="w-full">
                <SelectValue placeholder="Select Link Type" />
              </SelectTrigger>
              <SelectContent>
                {linkTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {selectedLinkType !== "custom-link" ? (
            <SurveyTypeDropdowns
              selectedLinkType={selectedLinkType}
              selectedSurveyTitle={selectedSurveyTitle}
              onSurveyTitleDDChange={setSelectedSurveyTitle}
              surveyTitleAutoCompleteSearch={surveyTitleAutoCompleteSearch}
              onSurveyTitleAutoCompleteSearchChange={setSurveyTitleAutoCompleteSearch}
              onLinkDisplayNameChange={setWsOrWasLinkDisplayName}
              linkDisplayName={wsOrWasLinkDisplayName}
              selectedTeam={selectedTeam}
              onSelectedTeamDDChange={setSelectedTeam}
              errors={dropdownErrors}
            />
          ) : (
            <CustomLinkInputs control={customLinksInputsForm.control} />
          )}

          <div className={styles["cancel-save-btns-container"]}>
            <Button variant="outline" onClick={onClose} className={styles["cancel-btn"]}>
              Cancel
            </Button>
            <Button onClick={onAddBtnClick}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddLinkModal;
