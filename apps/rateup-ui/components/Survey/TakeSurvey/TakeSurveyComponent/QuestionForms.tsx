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
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

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

  return (
    <Stack>
      <Paper mt="xs" shadow="sm" className={classes.inputBox}>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          value={response?.length > 0 ? response : ""}
          onChange={updateResponse}
          className={classes.inputPhone}
        />
      </Paper>
    </Stack>
  );
}

export function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Stack>
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter email address"
          value={response || ""}
          onChange={(e) => updateResponse(e.currentTarget.value)}
          style={{ maxWidth: "400px" }}
          leftSection={<IconMail size="1.2rem" color="gray" />}
          variant="unstyled"
          classNames={{
            input: classes.input,
          }}
        />
      </Paper>
    </Stack>
  );
}

export function EmailPhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, email: e.currentTarget.value });
  };

  const emailRef = useRef(null);

  return (
    <Stack>
      <Paper
        shadow="sm"
        className={classes.inputBox}
        onClick={() => emailRef.current.focus()}
      >
        <Group>
          <TextInput
            placeholder="Enter your email"
            ref={emailRef}
            value={response?.email}
            onChange={handleEmailChange}
            style={{ maxWidth: "400px" }}
            variant="unstyled"
            classNames={{
              input: classes.input,
              root: classes.textRoot,
            }}
            leftSection={<IconMail size="1.2rem" color="gray" />}
          />
        </Group>
      </Paper>

      <Paper mt="xs" shadow="sm" className={classes.inputBox}>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          value={response?.phone || null}
          onChange={(value) => updateResponse({ ...response, phone: value })}
          className={classes.inputPhone}
        />
      </Paper>
    </Stack>
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
  const [selectedOp, setSelectedOp] = useState("");

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const sampleChoices = [
    { value: "option1", weightage: "" },
    { value: "option2", weightage: "" },
    { value: "option3", weightage: "" },
    { value: "option4", weightage: "" },
  ];
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;

  const data = options?.map((op) => op?.value);

  useEffect(() => {
    if (selectedOp) {
      // @ts-ignore
      const res = options?.find((op) => op?.value === selectedOp);
      updateResponse(res);
    } else {
      updateResponse(response);
    }
  }, [selectedOp, response]);

  return (
    <Stack>
      <ScrollArea.Autosize mah={"30vh"} maw={"90vh"}>
        <Stack ml="sm">
          <SegmentedControl
            data={data}
            value={response ? response?.value : selectedOp}
            onChange={setSelectedOp}
            orientation={"vertical"}
            color="var(--tertiary-color)"
            size="md"
            classNames={{ label: classes.sglabel }}
          />
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

export function MSQForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState([]);
  const sampleChoices = [
    { value: "option1", weightage: "" },
    { value: "option2", weightage: "" },
    { value: "option3", weightage: "" },
    { value: "option4", weightage: "" },
  ];
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;

  const data = options?.map((op) => op?.value);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  useEffect(() => {
    if (selectedOp.length) {
      const res = selectedOp?.map((s) => {
        // @ts-ignore
        return options.find((op) => op?.value === s);
      });
      updateResponse(res);
    }
  }, [selectedOp]);
  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, []);

  return (
    <Checkbox.Group value={selectedOp} onChange={setSelectedOp}>
      <Stack>
        {data?.map((choice) => (
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
  const [selectedOp, setSelectedOp] = useState("");

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const sampleChoices = [
    { value: "option1", weightage: "" },
    { value: "option2", weightage: "" },
    { value: "option3", weightage: "" },
    { value: "option4", weightage: "" },
  ];
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;

  const data = options?.map((op) => op?.value);

  useEffect(() => {
    if (selectedOp) {
      // @ts-ignore
      const res = options?.find((op) => op?.value === selectedOp);
      updateResponse(res);
    } else {
      updateResponse(response);
    }
  }, [selectedOp, response]);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Select
        style={{ minWidth: "300px", maxWidth: "500px" }}
        placeholder="Select one"
        data={data}
        value={response ? response?.value : selectedOp}
        onChange={setSelectedOp}
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

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [selectedOp, setSelectedOp] = useState([]);
  const sampleChoices = [
    { value: "option1", weightage: "" },
    { value: "option2", weightage: "" },
    { value: "option3", weightage: "" },
    { value: "option4", weightage: "" },
  ];
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;

  const data = options?.map((op) => op?.value);

  useEffect(() => {
    if (selectedOp.length) {
      const res = selectedOp?.map((s) => {
        // @ts-ignore
        return options.find((op) => op?.value === s);
      });
      updateResponse(res);
    }
  }, [selectedOp]);

  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, []);
  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <MultiSelect
        style={{ minWidth: "300px", maxWidth: "500px" }}
        data={data}
        value={selectedOp}
        onChange={setSelectedOp}
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

export function CustomNPSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedOp, setSelectedOp] = useState("");

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const sampleChoices = [
    { value: "option1", weightage: "" },
    { value: "option2", weightage: "" },
    { value: "option3", weightage: "" },
    { value: "option4", weightage: "" },
  ];
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;
  const data = options?.map((op) => op?.value);
  useEffect(() => {
    if (selectedOp) {
      // @ts-ignore
      const res = options?.find((op) => op?.value === selectedOp);
      updateResponse(res);
    } else {
      updateResponse(response);
    }
  }, [selectedOp, response]);
  return (
    <Stack ml="sm">
      <ScrollArea.Autosize mah={"30vh"} maw={"90vh"}>
        <SegmentedControl
          data={data}
          value={response ? response?.value : selectedOp}
          onChange={setSelectedOp}
          orientation={"vertical"}
          color={"var(--tertiary-color)"}
          size="md"
          classNames={{ label: classes.sglabel }}
        />
      </ScrollArea.Autosize>
    </Stack>
  );
}
