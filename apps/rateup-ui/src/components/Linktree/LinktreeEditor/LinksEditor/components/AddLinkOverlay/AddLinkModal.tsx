import { ActionIcon, Box, Button, Modal, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";

import { linkTypeOptions } from "../../constants.tsx";
import CustomLinkInputs from "./CustomLinkInputs.tsx";
import SurveyTypeDropdowns from "./SurveyTypeDropdowns.tsx";

import styles from "./AddLinkModal.module.css";

function AddLinkModal({ title, opened, onClose, links }) {
  const queryClient = useQueryClient();

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  // SurveyTypeDropdowns states
  const [selectedLinkType, setSelectedLinkType] = useState("web-survey");
  const [surveyTitleAutoCompleteSearch, setSurveyTitleAutoCompleteSearch] = useState("");
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // Web Survey or Whatsapp Survey Link Display name.
  const [wsOrWasLinkDisplayName, setWsOrWasLinkDisplayName] = useState("");
  const [dropdownErrors, setDropdownErrors] = useState({
    selectedSurveyTitleErr: "",
    selectedTeamErr: "",
    wsOrWasLinkDisplayNameErr: "",
  });

  // CustomLinkInputs states
  const customLinksInputsForm = useForm({
    initialValues: {
      linkDisplayName: "",
      linkUrl: "",
    },
    validate: {
      linkDisplayName: (value) => {
        if (value) return null;
        else return "Link dispaly name is required.";
      },
      linkUrl: (value) => {
        if (value) {
          try {
            new URL(value);
          } catch {
            return "Please enter a valid url";
          }
        } else return "Link url is required.";
      },
    },
  });

  const updateLinktreeMutation = useUpdateLinktreeMutation(shortUrlId);

  const handleSelectedLinkTypeDropdownChange = useCallback(
    (value) => {
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
    // const dropdownErrors = {};
    const newErrState = {};
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
      const isCustomInputsValid = !customLinksInputsForm.validate().hasErrors;
      if (isCustomInputsValid) {
        const reqBody = {
          shortUrlId,
          links: [
            ...links,
            {
              id: uuidv4(),
              ...customLinksInputsForm.values,
            },
          ],
        };
        await updateLinktreeMutation.mutateAsync(reqBody);
        onClose();
      }
    }
  }, [selectedLinkType, selectedSurveyTitle, selectedTeam, customLinksInputsForm]);

  useEffect(() => {
    setSelectedSurveyTitle(null);
    setSurveyTitleAutoCompleteSearch("");
    setWsOrWasLinkDisplayName("");
  }, [selectedLinkType]);

  useEffect(() => {
    setSelectedTeam(null);
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
    <Modal
      opened={opened}
      onClose={onClose}
      radius="lg"
      centered
      className={`${styles["addlink-overlay-div"]} ${opened ? styles["opened"] : styles["closed"]}`}
      classNames={{
        header: styles["modal-header"],
        body: styles["modal-body"],
      }}
    >
      <Box className={styles["header"]}>
        <h1 className={styles["title"]}>{title}</h1>
        <ActionIcon
          className={styles["close-btn"]}
          onClick={() => {
            onClose();
          }}
        >
          <IconX />
        </ActionIcon>
      </Box>

      <Box className={styles["body"]}>
        <Select
          value={selectedLinkType}
          label={"Select Link type"}
          placeholder="Select Link Type"
          data={linkTypeOptions}
          onChange={handleSelectedLinkTypeDropdownChange}
          allowDeselect={false}
        />

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
          <CustomLinkInputs form={customLinksInputsForm} />
        )}

        <Box className={styles["cancel-save-btns-container"]}>
          <Button onClick={onClose} className={styles["cancel-btn"]}>
            Cancel
          </Button>
          <Button onClick={onAddBtnClick}>Add</Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default AddLinkModal;
