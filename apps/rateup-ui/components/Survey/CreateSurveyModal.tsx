import {
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { PillsInput, Pill, Combobox, CheckIcon, useCombobox } from '@mantine/core';

import { createFormContext } from "@mantine/form";
import { useQuery } from "@tanstack/react-query";
import { getTeamsByUser } from "../../backend/team/team.api";
import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState, useEffect } from 'react'

interface FormValues {
  title: string;
  languages: Array<string>;
  teamId: string;
  type: string;
  getLocation: boolean;
}
const [FormProvider, useFormContext, useForm] = createFormContext<FormValues>();
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);

export function CreateSurveyModal({ open, close, surveyType }) {
  const {
    isError,
    isLoading,
    data: teams,
    error,
  } = useQuery(["teamsByUser"], getTeamsByUser);

  let teamSelectData = teams?.data?.data?.map((team) => ({
    value: team.teamId,
    label: team.teamName,
  }));

  //------------type select data -----------
  const typesArray = ["web", "whatsapp"];
  let typeSelectData = typesArray.map((type) => ({
    value: type,
    label: type,
  }));

  const [languages, setLanguages] = useState<string[]>([]);

   const form = useForm({
    initialValues: {
      title: "",
      languages: [],
      teamId: null,
      type: surveyType ? surveyType : "web",
      getLocation: false,
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      languages: (values) =>
        values.length ? null : "Must contain atleast one language",
      teamId: (value) => (value ? null : "Must select a team"),
      type: (value) => (value ? null : "Must select a type"),
    },
  });

  useEffect(() => {
    form.setFieldValue('languages', languages)
    console.log(languages)
  }, [languages])

  const resetForm = () => {
    form.reset()
    setLanguages([])
  }

  useEffect(() => {
    form.reset()
    setLanguages([])
  }, [open])

  const [isCreating, setIsCreating] = useState(false);

  const createSurveyMutation = useCreateSurveyMutation({ close, resetForm, setIsCreating });

  const onSubmit = (e) => {
    e.preventDefault();
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true)
    notifications.show({
      id: 'load-data',
      loading: true,
      title: 'Creating survey..',
      message: `Hold on, your survey is getting created...`,
      autoClose: false,
      withCloseButton: false,
    });
    createSurveyMutation.mutate(form.values);

  };
  if (isLoading) {
    return null;
  }
  if (isError || !teams?.data?.data) {

    console.error(error)
    notifications.show({
      id: "load-data",
      color: "red",
      title: "Error",
      message: "Failed Loading teams!",
      icon: <IconX size="1rem" />,
      autoClose: 3000,
    });
  }
  return (
    <Modal
      opened={open}
      onClose={() => {
        close();
        form.reset();
      }}
      title="Create Survey"
      centered
      styles={{
        title: {
          fontSize: '25px',
          fontWeight: 700,
          padding: "10px"
        }
      }}
    >
      <FormProvider form={form} >
        <form onSubmit={onSubmit}>
          <Stack style={{ minHeight: "300px" }} mt="xl">
            <TextInput
              placeholder="Enter title"
              label="Title"
              withAsterisk
              {...form.getInputProps("title")}
            />


{/* // TODO: Add a user-level language list */}


            <MultiSelectCreatable value={languages} setValue={setLanguages} errors={form.errors.languages} />

            <Select
              label="Team"
              placeholder="Select team"
              data={teamSelectData}
              withAsterisk
              maxDropdownHeight={110}
              {...form.getInputProps("teamId")}
            />
            {/* //-----------------survey type ----------- */}
            {!surveyType && (
              <Select
                label="Type"
                placeholder="Select survey type"
                data={typeSelectData}
                withAsterisk
                {...form.getInputProps("type")}
              />
            )}
            <Box>
              <Switch
                label="Save respondent's location"
                {...form.getInputProps("getLocation")}
              />
              <Text
                c="dimmed"
                fz="xs"
                >
                  {`(Automatically fetched from the browser if the respondent allows it.)`}
                </Text>
            </Box>
            <Group justify="flex-end" pt="xl" mt="lg">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button variant="filled" type="submit" loading={isCreating}>
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </FormProvider>
    </Modal>
  );
}


interface iProps {
  value: string[];
  setValue: React.Dispatch<React.SetStateAction<string[]>>;
  errors: any
}

export function MultiSelectCreatable({ value, setValue, errors} : iProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex('active'),
  });


  useEffect(() => {
    console.log(errors)

  }, [errors])
  

  let languages= Array.from(Languages);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(languages);

  const exactOptionMatch = data.some((item) => item === search);

  const handleValueSelect = (val: string) => {
    if (val === '$create') {
      setData((current) => [...current, search]);
      setValue((current) => [...current, search]);
      setSearch('');
    } else {
      setValue((current) =>
        current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
      );
    }
  };

  const handleValueRemove = (val: string) =>
    setValue((current) => current.filter((v) => v !== val));

  const values = value.map((item) => (
    <Pill key={item} withRemoveButton onRemove={() => handleValueRemove(item)}>
      {item}
    </Pill>
  ));

  const options = languages
    .filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
    .map((item) => (
      <Combobox.Option                 title="Language"
      value={item} key={item} active={value.includes(item)}>
        <Group gap="sm">
          {value.includes(item) ? <CheckIcon size={12} /> : null}
          <span>{item}</span>
        </Group>
      </Combobox.Option>
    ));

  return (
    <Combobox  store={combobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
      <Combobox.DropdownTarget >

        <PillsInput 
          error={errors ? errors : false}
          label="Languages" 
          withAsterisk 
          onClick={() => combobox.openDropdown()}
        >
          
          <Pill.Group  >
            {values}

            <Combobox.EventsTarget>
                <PillsInput.Field
                  onFocus={() => combobox.openDropdown()}
                  onBlur={() => combobox.closeDropdown()}
                  value={search}
                  placeholder="Select languages"
                  onChange={(event) => {
                    combobox.updateSelectedOptionIndex();
                    setSearch(event.currentTarget.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && search.length === 0) {
                      event.preventDefault();
                      handleValueRemove(value[value.length - 1]);
                    }
                  }}
                />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options}

          {!exactOptionMatch && search.trim().length > 0 && (
            <Combobox.Option value="$create">+ Create {search}</Combobox.Option>
          )}

          {exactOptionMatch && search.trim().length > 0 && options.length === 0 && (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
