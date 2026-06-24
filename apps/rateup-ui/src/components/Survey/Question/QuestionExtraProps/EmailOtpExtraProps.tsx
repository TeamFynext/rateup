"use client";

import { useContext, useState } from "react";

import {
  ActionIcon,
  Blockquote,
  Checkbox,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useImportEmailIdsMutation } from "@/backend/surveys/questions/questions.query";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { emailPattern } from "@/utils/constants.ts";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../Button/RateupButtons.tsx";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput.tsx";
import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";

enum AllowEmailForOTP {
  allEmail = "All Emails",
  emailFromList = "Emails from list",
}

enum EmailAddMethod {
  Manual = "Add Manually",
  Import = "Import from file",
}

const EmailOtpExtraProps = ({ form, qId, surveyLanguages }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values?.features?.[selectedLanguage] || {
    allowedEmails: [],
    isRestricted: false,
  };
  const allowedEmailIDs = features?.allowedEmails || [];
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [emailMethod, setEmailMethod] = useState(EmailAddMethod.Manual);
  const [newEmail, setNewEmail] = useState("");
  const [inputError, setInputError] = useState("");
  const allChecked = allowedEmailIDs?.every((email) =>
    selectedEmailIds.includes(email),
  );
  const { t: translations } = useTranslation();
  const indeterminate =
    allowedEmailIDs?.some((email) => selectedEmailIds.includes(email)) &&
    !allChecked;
  const rows = allowedEmailIDs?.map((email) => (
    <Table.Tr
      key={email}
      bg={
        selectedEmailIds.includes(email)
          ? "var(--mantine-color-blue-light)"
          : undefined
      }
    >
      <Table.Td>
        <Checkbox
          aria-label={translations("Select email")}
          checked={selectedEmailIds.includes(email)}
          onChange={(event) =>
            setSelectedEmailIds(
              event.currentTarget.checked
                ? [...selectedEmailIds, email]
                : selectedEmailIds.filter((em) => em !== email),
            )
          }
          size="xs"
        />
      </Table.Td>
      <Table.Td>{email}</Table.Td>
    </Table.Tr>
  ));

  const handleDelete = () => {
    if (!selectedEmailIds.length) return;
    const remainingIds = allowedEmailIDs?.filter(
      (email) => !selectedEmailIds.includes(email),
    );
    const featuresObj = { ...form.values?.features };
    for (const lang of surveyLanguages) {
      featuresObj[lang] = {
        ...form.values.features?.[lang],
        allowedEmails: remainingIds,
      };
    }
    form.setFieldValue("features", {
      ...featuresObj,
    });
    setSelectedEmailIds([]);
  };

  const handleAddEmail = () => {
    if (!newEmail || !emailPattern.test(newEmail)) {
      setInputError(translations("Invalid Email"));
      return;
    }
    if (allowedEmailIDs?.includes(newEmail)) {
      setInputError(translations("Email Already exists"));
      return;
    }
    allowedEmailIDs?.push(newEmail);
    const featuresObj = { ...form.values?.features };
    for (const lang of surveyLanguages) {
      featuresObj[lang] = {
        ...form.values.features?.[lang],
        allowedEmails: allowedEmailIDs,
      };
    }
    form.setFieldValue("features", {
      ...featuresObj,
    });
    setNewEmail("");
  };

  return (
    <Stack w={"100%"}>
      <Tooltip label={translations("Allowed Emails")}>
        <SegmentedControl
          data={Object.values(AllowEmailForOTP)}
          value={
            features?.isRestricted
              ? AllowEmailForOTP.emailFromList
              : AllowEmailForOTP.allEmail
          }
          onChange={(value) =>
            form.setFieldValue("features", {
              ...form.values?.features,
              [selectedLanguage]: {
                ...features,
                isRestricted: value == AllowEmailForOTP.emailFromList,
              },
            })
          }
          w={220}
          color="var(--tertiary-color)"
          radius={"md"}
          defaultValue={AllowEmailForOTP.allEmail}
        />
      </Tooltip>
      {features.isRestricted && (
        <Stack>
          <PaperLayout display={!allowedEmailIDs?.length ? "none" : "block"}>
            <Group p={6}>
              {selectedEmailIds.length && (
                <ActionIcon
                  size={"sm"}
                  variant="subtle"
                  color="gray"
                  onClick={handleDelete}
                >
                  <IconTrash />
                </ActionIcon>
              )}
            </Group>
            <Title order={5} ta={"center"}>
              {translations("Allowed Email IDs")}
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      aria-label={translations("Select email")}
                      indeterminate={indeterminate}
                      checked={allChecked}
                      onChange={() => {
                        if (!allChecked) setSelectedEmailIds(allowedEmailIDs);
                        else setSelectedEmailIds([]);
                      }}
                      size="xs"
                    />
                  </Table.Th>
                  <Table.Th>{translations("Email ID")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </PaperLayout>
          <ContainedSelection
            data={Object.values(EmailAddMethod)}
            label={translations("Method")}
            w={250}
            placeholder={translations("Selecte a method to add email")}
            value={emailMethod}
            onChange={(value) => setEmailMethod(value as EmailAddMethod)}
            allowDeselect={false}
          />
          {emailMethod == EmailAddMethod.Import ? (
            <ImportAllowedEmailIDs qId={qId} />
          ) : (
            <Group>
              <ContainedTextField
                value={newEmail}
                onChange={(e) => {
                  setInputError("");
                  setNewEmail(e.currentTarget.value);
                }}
                error={inputError}
                placeholder={translations("Enter email here")}
                style={{
                  flexGrow: 1,
                }}
              />
              <RateupButtonSecondary
                title={translations("Add")}
                leftIcon={<IconPlus size={"1rem"} />}
                onClick={handleAddEmail}
              />
            </Group>
          )}
        </Stack>
      )}
    </Stack>
  );
};

const ImportAllowedEmailIDs = ({ qId }) => {
  const [file, setFile] = useState<File | null>(null);
  const { surveyId } = useContext(SurveyContext);
  const importEmailIdsMutate = useImportEmailIdsMutation(surveyId);
  const { t: translations } = useTranslation();
  const handleUploadFile = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    importEmailIdsMutate.mutate(
      { questionId: qId, data: formData, surveyId },
      {
        onSuccess: () => {
          toast.success(translations("Email Ids imported"));
          setFile(null);
        },
        onError: (error) => {
          toast.error(
            error?.message || translations("Error in importing emailIds"),
          );
          setFile(null);
        },
      },
    );
  };

  return (
    <Group justify="space-between" w={"100%"}>
      <Blockquote
        color="blue"
        icon={<IconInfoCircle />}
        p={"sm"}
        iconSize={40}
        w={350}
        ml={10}
      >
        {translations(
          "Upload CSV/XLSX file to generate allowed email Ids. required field in the file: email",
        )}
      </Blockquote>
      <Stack>
        <ContainedFileInput
          onChange={setFile}
          accept=".csv, .xlsx"
          value={file}
          w={300}
          placeholder={translations("Click to Select file")}
        />
        <RateupButtonBlue
          title={translations("Upload")}
          loading={importEmailIdsMutate.isPending}
          onClick={handleUploadFile}
          disabled={!file}
        />
      </Stack>
    </Group>
  );
};

export default EmailOtpExtraProps;
