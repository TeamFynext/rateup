import { useEffect } from "react";
import { useRouter } from "next/router";

import {
  Box,
  Button,
  Checkbox,
  Group,
  Radio,
  SelectProps,
  Stack,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";

import useTranslations from "@/dictionaries/useTranslation";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import { useWaTemplates } from "../../../../backend/whatsapp/whatsapp.query";
import {
  ContainedSelection,
  ContainedTagInput,
  ContainedTextArea,
  ContainedTextField,
} from "../../../../components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import {
  WaAutomatedReplyMatchType,
  WaAutomatedReplyResponseType,
} from "../../../../types/enums";
import {
  WaAutomatedReply,
  WaAutomatedReplyMatchData,
} from "../../../../types/global";

export default function CreateAutomatedReplyPage() {
  return (
    <Stack>
      <h1>Create Automated Reply</h1>
      <AutomatedReplyForm />
    </Stack>
  );
}

function getInitialValues(initialValues?: WaAutomatedReply) {
  if (initialValues) return initialValues;
  return {
    name: "",
    responseType: WaAutomatedReplyResponseType.Text,
    teamId: "",
    matchType: WaAutomatedReplyMatchType.ContainsAnyOf,
    matchData: {
      keywords: [],
      json: {},
      caseSensitive: false,
    },
    enableTicket: false,
  };
}

interface AutoPilotFormProps {
  initialValues?: WaAutomatedReply;
  editMode?: boolean;
  close?: () => void;
}
export function AutomatedReplyForm({
  initialValues,
  editMode,
  close,
}: AutoPilotFormProps) {
  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
  });

  const matchDataForm = useForm<WaAutomatedReplyMatchData>({
    initialValues: getInitialValues(initialValues).matchData,
  });

  useEffect(() => {
    if (!initialValues) return;
    const init = getInitialValues(initialValues);
    rootForm.setInitialValues(init);
    matchDataForm.setInitialValues(init.matchData);
  }, [initialValues]);

  const router = useRouter();
  let automatedId = router.query.waAutomatedReplyId as string;
  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation(automatedId);

  function handleCancelClick() {
    rootForm.reset();
    matchDataForm.reset();
    close();
  }

  function handleSubmitClick() {
    const data = { ...rootForm.values, matchData: matchDataForm.values };

    if (editMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data, {
        onSettled: () => {
          handleCancelClick();
        },
      });
    }
  }

  return (
    <form onSubmit={rootForm.onSubmit((values) => handleSubmitClick())}>
      <Stack>
        <Group>
          <ContainedTextField
            label="Name"
            placeholder="Enter name"
            required
            style={{ flex: 4 }}
            {...rootForm.getInputProps("name")}
          />
          <TeamSelector
            label="Team"
            required
            style={{ flex: 3 }}
            {...rootForm.getInputProps("teamId")}
          />
        </Group>

        <Radio.Group
          label="Match Type"
          required
          {...rootForm.getInputProps("matchType")}
        >
          <Group pl={"xs"} pt={"xs"}>
            <Radio
              value={WaAutomatedReplyMatchType.ContainsAnyOf}
              label={"Contains Any Of"}
            />
            <Radio
              value={WaAutomatedReplyMatchType.ContainsAllOf}
              label={"Contains All Of"}
            />
            <Radio
              value={WaAutomatedReplyMatchType.Exact}
              label={"Exactly Equals"}
            />
          </Group>
        </Radio.Group>

        <MatchDataForm
          matchDataForm={matchDataForm}
          type={rootForm.values.matchType}
        />
        <Checkbox
          label={"Create Ticket"}
          {...rootForm.getInputProps("enableTicket")}
          checked={rootForm.values.enableTicket}
        />
        {/* <ContainedSelection
          label="Response Type"
          data={Object.values(WaAutomatedReplyResponseType)}
          {...rootForm.getInputProps("responseType")}
        /> */}
        {/* <ResponseSelector type={rootForm.values.responseType} form={rootForm} /> */}

        <Group justify={"space-between"}>
          <Button onClick={handleCancelClick} variant="light">
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
          >
            Submit
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

interface MatchDataFormProps {
  matchDataForm: UseFormReturnType<WaAutomatedReplyMatchData, any>;
  type: WaAutomatedReplyMatchType;
}

function MatchDataForm({ matchDataForm, type }: MatchDataFormProps) {
  return (
    <Group>
      <Box style={{ flex: 4 }}>
        {[
          WaAutomatedReplyMatchType.ContainsAllOf,
          WaAutomatedReplyMatchType.ContainsAnyOf,
        ].includes(type) && (
          <ContainedTagInput
            required
            label="Keywords"
            placeholder="Enter keywords"
            {...matchDataForm.getInputProps("keywords")}
          />
        )}
        {type === WaAutomatedReplyMatchType.Exact && (
          <ContainedTextField
            required
            label="Exact Text"
            placeholder="Enter exact text"
            {...matchDataForm.getInputProps("exactText")}
          />
        )}
      </Box>
      <Checkbox
        mt={"lg"}
        label="Case Sensitive"
        {...matchDataForm.getInputProps("caseSensitive", { type: "checkbox" })}
      />
    </Group>
  );
}

interface ResponseSelectorProps {
  type: WaAutomatedReplyResponseType;
  form: UseFormReturnType<any, any>;
}
function ResponseSelector({ type, form }: ResponseSelectorProps) {
  return (
    <>
      {type === WaAutomatedReplyResponseType.Text && (
        <ContainedTextArea
          required
          label="Response"
          placeholder="Enter response"
          {...form.getInputProps("responseText")}
        />
      )}
      {type === WaAutomatedReplyResponseType.Template && (
        <TemplateSelector {...form.getInputProps("responseTemplateId")} />
      )}
    </>
  );
}

function TemplateSelector(props: SelectProps) {
  const { data: templates } = useWaTemplates();
  const { translations } = useTranslations();
  if (!templates || !Array.isArray(templates)) return <RateupLoader />;
  return (
    <ContainedSelection
      {...props}
      label={translations["Template"]}
      required
      data={templates.map((t) => ({ label: t.data.name, value: t.id }))}
    />
  );
}
