import { IconInfoCircle, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { useId, useContext, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useImportEmailIdsMutation } from "@/backend/surveys/questions/questions.query";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import SurveyContext from "@/context/SurveyContext.ts";
import { emailPattern } from "@/utils/constants.ts";

enum AllowEmailForOTP {
  allEmail = "All Emails",
  emailFromList = "Emails from list",
}

enum EmailAddMethod {
  Manual = "Add Manually",
  Import = "Import from file",
}

const EmailOtpExtraProps = ({
  form,
  qId,
  surveyLanguages,
}: {
  form: UseFormReturn<FieldValues>;
  qId: string;
  surveyLanguages: string[];
}) => {
  const uid = useId();
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values?.features?.[selectedLanguage] || {
    allowedEmails: [],
    isRestricted: false,
  };
  const allowedEmailIDs: string[] = features?.allowedEmails || [];
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [emailMethod, setEmailMethod] = useState<EmailAddMethod>(EmailAddMethod.Manual);
  const [newEmail, setNewEmail] = useState("");
  const [inputError, setInputError] = useState("");
  const { t: translations } = useTranslation();

  const allChecked =
    allowedEmailIDs.length > 0 && allowedEmailIDs.every((e) => selectedEmailIds.includes(e));
  const indeterminate = allowedEmailIDs.some((e) => selectedEmailIds.includes(e)) && !allChecked;

  const handleDelete = () => {
    if (!selectedEmailIds.length) return;
    const remainingIds = allowedEmailIDs.filter((e) => !selectedEmailIds.includes(e));
    const featuresObj = { ...form.values?.features };
    for (const lang of surveyLanguages) {
      featuresObj[lang] = { ...form.values.features?.[lang], allowedEmails: remainingIds };
    }
    form.setFieldValue("features", featuresObj);
    setSelectedEmailIds([]);
  };

  const handleAddEmail = () => {
    if (!newEmail || !emailPattern.test(newEmail)) {
      setInputError(translations("Invalid Email"));
      return;
    }
    if (allowedEmailIDs.includes(newEmail)) {
      setInputError(translations("Email already exists"));
      return;
    }
    const updated = [...allowedEmailIDs, newEmail];
    const featuresObj = { ...form.values?.features };
    for (const lang of surveyLanguages) {
      featuresObj[lang] = { ...form.values.features?.[lang], allowedEmails: updated };
    }
    form.setFieldValue("features", featuresObj);
    setNewEmail("");
  };

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        value={
          [
            features?.isRestricted ? AllowEmailForOTP.emailFromList : AllowEmailForOTP.allEmail,
          ] as string[]
        }
        onValueChange={(values) => {
          if (!values.length) return;
          form.setFieldValue("features", {
            ...form.values?.features,
            [selectedLanguage]: {
              ...features,
              isRestricted: values[0] === AllowEmailForOTP.emailFromList,
            },
          });
        }}
        className="w-fit rounded-lg border bg-muted p-1"
      >
        {Object.values(AllowEmailForOTP).map((v) => (
          <ToggleGroupItem
            key={v}
            value={v}
            className="rounded-md px-4 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            {v}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {features.isRestricted && (
        <div className="flex flex-col gap-3">
          {allowedEmailIDs.length > 0 && (
            <div className="rounded-lg border bg-background">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-medium">{translations("Allowed Email IDs")}</p>
                {selectedEmailIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={(indeterminate ? "mixed" : allChecked) as boolean}
                        onCheckedChange={(checked) =>
                          setSelectedEmailIds(checked ? [...allowedEmailIDs] : [])
                        }
                        aria-label={translations("Select all")}
                      />
                    </TableHead>
                    <TableHead>{translations("Email ID")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowedEmailIDs.map((email) => (
                    <TableRow
                      key={email}
                      className={selectedEmailIds.includes(email) ? "bg-primary/5" : ""}
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedEmailIds.includes(email)}
                          onCheckedChange={(checked) =>
                            setSelectedEmailIds(
                              checked
                                ? [...selectedEmailIds, email]
                                : selectedEmailIds.filter((e) => e !== email),
                            )
                          }
                          aria-label={translations("Select email")}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${uid}-field`}>{translations("Method")}</FieldLabel>
              <Select
                value={emailMethod}
                onValueChange={(v) => setEmailMethod(v as EmailAddMethod)}
              >
                <SelectTrigger id={`${uid}-field`} className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(EmailAddMethod).map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          {emailMethod === EmailAddMethod.Import ? (
            <ImportAllowedEmailIDs qId={qId} />
          ) : (
            <FieldGroup>
              <Field data-invalid={!!inputError}>
                <FieldLabel htmlFor={`${uid}-field-2`}>{translations("Email Address")}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id={`${uid}-field-2`}
                    value={newEmail}
                    placeholder={translations("Enter email here")}
                    aria-invalid={!!inputError}
                    onChange={(e) => {
                      setInputError("");
                      setNewEmail(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddEmail}>
                    <IconPlus data-icon="inline-start" />
                    {translations("Add")}
                  </Button>
                </div>
                {inputError && (
                  <FieldDescription className="text-destructive">{inputError}</FieldDescription>
                )}
              </Field>
            </FieldGroup>
          )}
        </div>
      )}
    </div>
  );
};

const ImportAllowedEmailIDs = ({ qId }: { qId: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (error) => {
          toast.error(error?.message || translations("Error in importing emailIds"));
          setFile(null);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <IconInfoCircle className="size-4" />
        <AlertDescription>
          {translations(
            "Upload CSV/XLSX file to generate allowed email Ids. required field in the file: email",
          )}
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <IconUpload data-icon="inline-start" />
          {file ? file.name : translations("Select file")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleUploadFile}
          disabled={!file || importEmailIdsMutate.isPending}
        >
          {importEmailIdsMutate.isPending && <Spinner data-icon="inline-start" />}
          {translations("Upload")}
        </Button>
      </div>
    </div>
  );
};

export default EmailOtpExtraProps;
