import {
  IconCalendarEvent,
  IconMail,
  IconThumbDownFilled,
  IconThumbUpFilled,
  IconX,
} from "@tabler/icons-react";

import { LDResponse, YNResponse } from "../../../../types/enums";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import {
  Button,
  Center,
  Checkbox,
  FileButton,
  Group,
  Rating,
  Stack,
  Text,
  TextInput,
  Paper,
  Input,
  Textarea,
  Box,
  Image,
  NumberInput,
  Select,
  MultiSelect,
  Combobox,
  InputBase,
  useCombobox,
  Flex,
  ActionIcon,
} from "@mantine/core";
import Flag from "react-world-flags";
import { getFileName } from "../../SurveyTheme/components/BackgroundStyles";
import SmileyRating from "./SmileyRating";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { DateInput } from "@mantine/dates";
import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import classes from "./TakeSurvey.module.css";
import { useMediaQuery } from "@mantine/hooks";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";

interface MCQFormProps {
  previewChoices?: Record<string, Array<string>>;
}

export function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Input
        placeholder="Enter your answer"
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        radius="xl"
        size="sm"
      />
    </Paper>
  );
}

export function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Textarea
        placeholder="Enter your answer"
        value={response?.length > 0 ? response?.replace(", ", "\n") : ""}
        onChange={(e) => {
          const replacedValue = e.currentTarget.value.replace(/\n/g, ", ");
          updateResponse(replacedValue);
        }}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        size="sm"
      />
    </Paper>
  );
}

export function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <NumberInput
        size="sm"
        placeholder="Enter number input"
        value={response || undefined}
        onChange={(value) => updateResponse(value)}
        variant="unstyled"
      />
    </Paper>
  );
}

export function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [phoneError, setPhoneError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const countries = [
    {
      name: "India",
      code: "+91",
      flag: "IN",
    },
    // {
    //   name: 'USA',
    //   code: '+1',
    //   flag: 'US',
    // },
    // {
    //   name: 'UAE',
    //   code: '+971',
    //   flag: 'AE',
    // },
    // Add more countries...
  ];
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [value, setValue] = useState<string | null>(countries[0].code);

  const options = countries?.map((country) => {
    return (
      <Combobox.Option
        style={{ minWidth: "150px" }}
        value={country?.code}
        key={country?.code}
      >
        <Group>
          <Flag code={country?.flag} height="16" />
          {/* <Text>{`${country.name} `}</Text> */}
        </Group>
      </Combobox.Option>
    );
  });

  //TODO : save with 91 in db if required

  useEffect(() => {
    if (response)
      setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  }, [response]);

  const handleInputBlur = () => {
    if (phoneError) {
    }
    setIsFocused(false);
  };
  const handleInputChange = (value: number) => {
    setIsFocused(true);
    const phone = value;
    updateResponse(phone);
    setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  };

  return (
    <Stack>
      <Paper
        shadow="sm"
        className={classes.inputBox}
        style={{ maxWidth: "300px" }}
      >
        <Group align="flex-start">
          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(val) => {
              setValue(val);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                onClick={() => combobox.toggleDropdown()}
                rightSectionPointerEvents="none"
                variant="unstyled"
              >
                {(
                  <Stack>
                    <Flag
                      code={
                        countries?.find((country) => country?.code === value)
                          ?.flag
                      }
                      height="15"
                    />
                  </Stack>
                ) || <Input.Placeholder>Select a country</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>{options}</Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
          <NumberInput
            size="sm"
            max={9999999999}
            placeholder="Enter 10 digit phone number"
            hideControls
            value={response || ""}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            variant="unstyled"
            style={{ minWidth: "185px" }}
          />
        </Group>
      </Paper>

      <Text c="red" fz="xs" ml="sm">
        {" "}
        {phoneError && !isFocused ? "* Invalid phone number" : null}
      </Text>
    </Stack>
  );
}

export function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [emailError, setEmailError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (response)
      setEmailError(/^\S+@\S+$/.test(response) ? null : "Invalid email");
  }, [response]);

  const handleInputBlur = () => {
    if (emailError) {
      // console.log("Invalid email");
    }
    setIsFocused(false);
  };
  const handleInputChange = (e) => {
    setIsFocused(true);
    const email = e.target.value;
    updateResponse(email);
    setEmailError(/^\S+@\S+$/.test(email) ? null : "Invalid email");
  };

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <TextInput
        placeholder="Enter email address"
        value={response || ""}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        style={{ maxWidth: "400px" }}
        error={emailError && !isFocused ? "Invalid email" : null}
        leftSection={<IconMail size="1.2rem" color="black" />}
        variant="unstyled"
      />
    </Paper>
  );
}

export function RatingForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Stack align="center">
      <Rating
        value={response}
        onChange={updateResponse}
        color="var(--tertiary-color)"
        size="xl"
        className={classes.rating}
        styles={{
          label: {
            paddingLeft: isMobile ? "3px" : "8px",
            paddingRight: isMobile ? "3px" : "8px",
          },
        }}
      />
    </Stack>
  );
}

export function LDForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={150}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Dislike ? "filled" : "outline"}
          radius="xl"
          title="Dislike"
          leftIcon={<IconThumbDownFilled />}
          fullWidth
          onClick={() => updateResponse(LDResponse.Dislike)}
        />
      </Box>
      <Box w={150} ml={!isMobile && "sm"}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Like ? "filled" : "outline"}
          radius="xl"
          title="Like"
          fullWidth
          leftIcon={<IconThumbUpFilled />}
          onClick={() => updateResponse(LDResponse.Like)}
        />
      </Box>
    </Group>
  );
}

export function OpinionScaleForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    for (let i = 1; i <= 10; i++) {
      const button = (
        <Button
          className={classes["opinion-scale-interval-btn"]}
          key={i}
          radius="md"
          onClick={() => updateResponse(i)}
          color={"var(--tertiary-color)"}
          variant={response === i ? "filled" : "outline"}
          styles={{
            root: { backgroundColor: response !== i && "#EBEFF7" },
          }}
        >
          {i}
        </Button>
      );
      if (i <= 5) {
        oneToFive.push(button);
      } else {
        fiveToTen.push(button);
      }
    }
    const firstFiveBtnsContiner = (
      <Flex className={classes["opinion-scale-first-five-btns-container"]}>
        {oneToFive}
      </Flex>
    );
    const secondFiveBtnsContainer = (
      <Flex className={classes["opinion-scale-last-five-btns-container"]}>
        {fiveToTen}
      </Flex>
    );
    return (
      <>
        {firstFiveBtnsContiner}
        {secondFiveBtnsContainer}
      </>
    );
  };

  return <Group className={classes["opinion-scale"]}>{renderButtons()}</Group>;
}

export function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.No ? "filled" : "outline"}
          radius="xl"
          title="No"
          fullWidth
          onClick={() => updateResponse(YNResponse.No)}
        />
      </Box>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.Yes ? "filled" : "outline"}
          radius="xl"
          title="Yes"
          fullWidth
          onClick={() => updateResponse(YNResponse.Yes)}
        />
      </Box>
    </Group>
  );
}

export function SmileyForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <SmileyRating updateResponse={updateResponse} response={response} />
    </Group>
  );
}

export function ImageForm({ isPreview }: { isPreview?: boolean }) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isPreview ? null : response || null,
  );
  const resetRef = useRef<() => void>(null);

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        updateResponse(fileKey);
      }
    };
    uploadAndUpdate();
  }, [file]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function removeImg() {
    setFile(null);
    resetRef.current?.();
    setPreviewUrl(null);
    updateResponse(null);
  }

  return (
    <Stack>
      <Box w={300}>
        <FileButton
          resetRef={resetRef}
          onChange={setFile}
          accept="image/png,image/jpeg"
        >
          {(props) => (
            <Button
              fullWidth
              size="lg"
              radius="lg"
              variant="outline"
              {...props}
            >
              Upload image
            </Button>
          )}
        </FileButton>
      </Box>

      <Stack mt="lg">
        {(file || response?.length > 0) && (
          <Group justify="flex-end">
            <ActionIcon
              onClick={removeImg}
              variant="filled"
              color="gray"
              radius="lg"
            >
              <IconX style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
          </Group>
        )}

        <Center>
          {(previewUrl || response?.length > 0) && (
            <Image
              src={
                previewUrl ||
                `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`
              }
              alt="Preview"
              style={{ maxWidth: "100px", height: "auto", maxHeight: "100px" }}
            />
          )}
        </Center>

        {(file || response?.length > 0) && (
          <Text size="sm" style={{ textAlign: "center" }} mt="sm">
            Picked file:{" "}
            {file?.name || getFileName(response, isPreview || false)}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

export function MCQForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const sampleChoices = ["option1", "option2", "option3", "option4"];

  return (
    <Stack>
      {selectedQ
        ? choices?.map((choice) => (
            <Checkbox
              checked={response === choice}
              onChange={() => updateResponse(choice)}
              key={choice}
              label={choice}
            />
          ))
        : previewChoices
        ? previewChoices?.[selectedLanguage]?.map((choice) => (
            <Checkbox
              checked={response === choice}
              onChange={() => updateResponse(choice)}
              key={choice}
              label={choice}
            />
          ))
        : sampleChoices?.map((choice) => (
            <Checkbox
              checked={response === choice}
              onChange={() => updateResponse(choice)}
              key={choice}
              label={choice}
            />
          ))}
    </Stack>
  );
}

export function MSQForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const sampleChoices = ["option1", "option2", "option3", "option4"];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Checkbox.Group value={response} onChange={updateResponse}>
      <Stack>
        {selectedQ
          ? choices?.map((choice) => (
              <Checkbox value={choice} key={choice} label={choice} />
            ))
          : previewChoices
          ? previewChoices?.[selectedLanguage]?.map((choice) => (
              <Checkbox value={choice} key={choice} label={choice} />
            ))
          : sampleChoices?.map((choice) => (
              <Checkbox value={choice} key={choice} label={choice} />
            ))}
      </Stack>
    </Checkbox.Group>
  );
}

export function DDSSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const sampleChoices = ["option1", "option2", "option3", "option4"];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const data = selectedQ
    ? choices?.map((choice) => ({ value: choice, label: choice }))
    : previewChoices
    ? previewChoices?.[selectedLanguage]?.map((choice) => ({
        value: choice,
        label: choice,
      }))
    : sampleChoices?.map((choice) => ({ value: choice, label: choice }));

  return (
    <Select
      style={{ minWidth: "300px", maxWidth: "500px" }}
      label="Select one option"
      placeholder="Pick one"
      data={data}
      value={response}
      onChange={(e) => updateResponse(e)}
    />
  );
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const sampleChoices = ["option1", "option2", "option3", "option4"];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const data = selectedQ
    ? choices?.map((choice) => ({ value: choice, label: choice }))
    : previewChoices
    ? previewChoices?.[selectedLanguage]?.map((choice) => ({
        value: choice,
        label: choice,
      }))
    : sampleChoices?.map((choice) => ({ value: choice, label: choice }));

  return (
    <MultiSelect
      style={{ minWidth: "300px", maxWidth: "500px" }}
      data={data}
      value={response}
      onChange={updateResponse}
      label="Select one or more options"
      placeholder="Pick one or more"
    />
  );
}

export function DateForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <DateInput
        value={response}
        onChange={updateResponse}
        placeholder="Select date"
        maw={400}
        mx="auto"
        variant="unstyled"
        leftSection={<IconCalendarEvent size="1.2rem" color="black" />}
      />
    </Paper>
  );
}

export function TestimonialForm() {
  // TODO: show some disclaimer about the image & testimonial being being displayed in public
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File>(response?.file);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, name: e.currentTarget.value });
  };
  const handleTestimonialChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    updateResponse({ ...response, testimonial: e.currentTarget.value });
  };
  //TODO: image storage
  console.error("Image storage not implemented");

  return (
    <Stack>
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter your name"
          value={response?.name}
          onChange={handleNameChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
        />
      </Paper>
      <Paper shadow="sm" className={classes.inputBox}>
        <Textarea
          placeholder="Enter your testimonial"
          value={response?.testimonial}
          onChange={handleTestimonialChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
        />
      </Paper>
      {/* Will be brought back once image storing setup is  */}
      {/* <FileButton onChange={setFile} accept="image/png,image/jpeg">
        {(props) => <Button {...props}>Upload your image</Button>}
      </FileButton>

      {file && (
        <Text size="sm" align="center" mt="sm">
          Picked file: {file.name}
        </Text>
      )} */}
    </Stack>
  );
}
