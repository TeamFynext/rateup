import {
  IconCalendarEvent,
  IconMail,
  IconPlus,
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
  Flex,
  ActionIcon,
  SegmentedControl,
  ScrollArea,
} from "@mantine/core";
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
        variant="unstyled"
        radius="xl"
        size="sm"
        classNames={{
          input: classes.input,
        }}
        style={{ maxWidth: "400px" }}
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
        classNames={{
          input: classes.input,
        }}
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
        value={parseInt(response) || null}
        onChange={(value) => updateResponse(value)}
        variant="unstyled"
        classNames={{
          input: classes.input,
        }}
      />
    </Paper>
  );
}

export function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [countryCode, setCountryCode] = useState("91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const handleCountryCode = (e) => {
    setCountryCode(e.currentTarget.value);
  };
  const handlePhoneNumber = (e) => {
    setPhoneNumber(e.currentTarget.value);
  };
  let error = "";
  if (!/^\d+$/.test(countryCode) || !/^\d+$/.test(phoneNumber))
    error = "* Invalid Phone Number";
  else {
    error = "";
    updateResponse(countryCode + phoneNumber);
  }
  return (
    <Paper
      shadow="sm"
      className={classes.inputBox}
      style={{ maxWidth: "300px" }}
    >
      <Stack gap={0}>
        <Group gap={0} align="flex-start">
          <TextInput
            label="C. Code"
            value={countryCode}
            onChange={handleCountryCode}
            leftSection={<IconPlus size={"1rem"} />}
            maw={70}
            maxLength={3}
            placeholder="code"
          />
          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChange={handlePhoneNumber}
            maxLength={12}
            placeholder="Enter phone number"
            miw={200}
          />
        </Group>
        <Text c="red" fz="xs">
          {error}
        </Text>
      </Stack>
    </Paper>
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
        classNames={{
          input: classes.input,
        }}
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
  const [isHovered, setIsHovered] = useState(null);

  const handleHover = (index) => {
    setIsHovered(index);
  };

  const handleLeave = () => {
    setIsHovered(null);
  };

  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    const colorMapping = {
      1: { c: "rgba(255, 92, 85, 1)", bg: "rgba(255, 92, 85, 0.2)" },
      2: { c: "rgba(255, 133, 128, 1)", bg: "rgba(255, 133, 128, 0.2)" },
      3: { c: "rgba(254, 183, 92, 1)", bg: "rgba(254, 183, 92, 0.2)" },
      4: { c: "rgba(254, 201, 133, 1)", bg: "rgba(254, 201, 133, 0.2)" },
      5: { c: "rgba(254, 220, 78, 1)", bg: "rgba(254, 220, 78, 0.2)" },
      6: { c: "rgba(254, 229, 122, 1)", bg: "rgba(254, 229, 122, 0.2)" },
      7: { c: "rgba(188, 234, 116, 1)", bg: "rgba(188, 234, 116, 0.2)" },
      8: { c: "rgba(166, 227, 70, 1)", bg: "rgba(166, 227, 70, 0.2)" },
      9: { c: "rgba(125, 203, 140, 1)", bg: "rgba(125, 203, 140, 0.2)" },
      10: { c: "rgba(82, 186, 102, 1)", bg: "rgba(82, 186, 102, 0.2)" },
    };

    for (let i = 1; i <= 10; i++) {
      const color = colorMapping[i].c;
      const bgColor = colorMapping[i].bg;

      const button = (
        <Button
          className={classes["opinion-scale-interval-btn"]}
          key={i}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          radius="xs"
          onClick={() => updateResponse(i)}
          color={"var(--tertiary-color)"}
          variant={response === i ? "filled" : "outline"}
          styles={{
            root: {
              backgroundColor:
                response !== i && isHovered !== i ? bgColor : color,
              borderColor: response !== i && color,
              borderWidth: "2px",
              color: response !== i && isHovered !== i ? color : "white",
            },
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
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const sampleChoices = ["option1", "option2", "option3", "option4"];

  return (
    <Stack>
      {selectedQ ? (
        <ScrollArea w={"90vw"} h={"100%"} style={{ minHeight: "30vh" }}>
          <Stack ml="sm">
            <SegmentedControl
              data={choices}
              value={response ? response : ""}
              onChange={updateResponse}
              orientation={"vertical"}
              color="var(--tertiary-color)"
              size="md"
              classNames={{ label: classes.sglabel }}
            />
          </Stack>
        </ScrollArea>
      ) : previewChoices ? (
        <Stack ml="xs">
          <SegmentedControl
            data={previewChoices?.[selectedLanguage]}
            value={response ? response : ""}
            onChange={updateResponse}
            orientation={"vertical"}
            color="var(--tertiary-color)"
            size="md"
            classNames={{ label: classes.sglabel }}
          />
        </Stack>
      ) : (
        <Stack ml="xs">
          <SegmentedControl
            data={sampleChoices}
            value={response ? response : ""}
            onChange={updateResponse}
            orientation={"vertical"}
            color="var(--tertiary-color)"
            size="md"
            classNames={{ label: classes.sglabel }}
          />
        </Stack>
      )}
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
              <Checkbox
                value={choice}
                key={choice}
                label={choice}
                classNames={{
                  label: classes.input,
                }}
              />
            ))
          : previewChoices
          ? previewChoices?.[selectedLanguage]?.map((choice) => (
              <Checkbox
                value={choice}
                key={choice}
                label={choice}
                classNames={{
                  label: classes.input,
                }}
              />
            ))
          : sampleChoices?.map((choice) => (
              <Checkbox
                value={choice}
                key={choice}
                label={choice}
                classNames={{
                  label: classes.input,
                }}
              />
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
    <Paper shadow="sm" className={classes.inputBox}>
      <Select
        style={{ minWidth: "300px", maxWidth: "500px" }}
        placeholder="Select one"
        data={data}
        value={response}
        onChange={(e) => updateResponse(e)}
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
      />
    </Paper>
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
    <Paper shadow="sm" className={classes.inputBox}>
      <MultiSelect
        style={{ minWidth: "300px", maxWidth: "500px" }}
        data={data}
        value={response}
        onChange={updateResponse}
        placeholder="Select one or more"
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
      />
    </Paper>
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
        classNames={{
          input: classes.input,
        }}
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
  //console.error("Image storage not implemented");

  return (
    <Stack>
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter your name"
          value={response?.name}
          onChange={handleNameChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </Paper>
      <Paper shadow="sm" className={classes.inputBox}>
        <Textarea
          placeholder="Enter your testimonial"
          value={response?.testimonial}
          onChange={handleTestimonialChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
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
