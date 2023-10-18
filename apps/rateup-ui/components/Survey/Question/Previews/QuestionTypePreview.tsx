import React, { useState, forwardRef } from "react";
import { QuestionType as Q } from "../../../../types/enums";
import {
  Button,
  NumberInput,
  FileButton,
  Select,
  Group,
  Rating,
  Text,
  Avatar,
  TextInput,
  Paper,
  Input,
  Box,
  Textarea,
} from "@mantine/core";
import classes from "../../TakeSurvey/TakeSurvey.module.css";
import {
  IconMail,
  IconThumbDownFilled,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { IconCalendarEvent } from "@tabler/icons-react";
import SmileyRatingPreview from "./SmileyRatingPreview";

const QuestionTypePreview = ({ type }) => {
  switch (type) {
    case Q.Text:
      return <TextForm />;
    case Q.Phone:
      return <PhoneForm />;
    case Q.Number:
      return <NumberForm />;
    case Q.TextArea:
      return <TextAreaForm />;
    case Q.Email:
      return <EmailForm />;
    case Q.Rating:
      return <RatingForm />;
    case Q.LD:
      return <LDForm />;
    case Q.YN:
      return <YNForm />;
    case Q.Opinion:
      return <OpinionScaleForm />;
    case Q.Smiley:
      return <SmileyRatingPreview />;
    case Q.Photo:
      return <ImageForm />;
    case Q.MCQ:
      return null;
    case Q.MSQ:
      return null;
    case Q.DDSS:
      return null;
    case Q.DDMS:
      return null;
    case Q.Testimonial:
      return null;
    case Q.DateTime:
      return <DateForm />;
    default:
      return <div>not implemented</div>;
  }

  function TextForm() {
    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <Input
          placeholder="Enter text input"
          style={{ width: "70vw", maxWidth: "400px" }}
          variant="unstyled"
          radius="xl"
          size="sm"
        />
      </Paper>
    );
  }

  function TextAreaForm() {
    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <Textarea
          placeholder="Enter multiline text input"
          style={{ maxWidth: "400px" }}
          variant="unstyled"
          radius="xl"
          size="sm"
        />
      </Paper>
    );
  }

  function NumberForm() {
    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <NumberInput
          size="sm"
          //type="number"  //VERIFY MANTINE
          placeholder="Enter number input"
          variant="unstyled"
        />
      </Paper>
    );
  }

  function PhoneForm() {
    const data = [
      {
        image: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/flag_india.png`,
        label: "+91",
        value: "91",
        description: "India",
      },
    ];

    interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
      image: string;
      label: string;
      description: string;
    }

    const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
      ({ image, label, description, ...others }: ItemProps, ref) => (
        <div ref={ref} {...others}>
          <Group wrap="nowrap">
            <Avatar src={image} style={{ minWidth: "50px" }} />
            <div>
              <Text size="sm">{label}</Text>
              <Text size="xs" opacity={0.65}>
                {description}
              </Text>
            </div>
          </Group>
        </div>
      ),
    );

    // const optionsFilter: OptionsFilter = ({ options, search }) => {
    //     const splittedSearch = search.toLowerCase().trim().split(' ');
    //     return (options as ComboboxItem[]).filter((option) => {
    //       const words = option.label.toLowerCase().trim().split(' ');
    //       return splittedSearch.every((searchWord) => words.some((word) => word.includes(searchWord)));
    //     });
    //   };

    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <Group>
          <Select
            style={{ maxWidth: "140px" }}
            placeholder="Select Country Code"
            // itemComponent={SelectItem} //TODO
            data={data}
            searchable
            maxDropdownHeight={400}
            defaultValue={data[0].value}
            // nothingFound="No results"   //TODO
            // filter={(value, item) =>
            //   item.label.toLowerCase().includes(value.toLowerCase().trim()) ||
            //   item.description.toLowerCase().includes(value.toLowerCase().trim())
            // } TODO  VERIFY MANTINE FILTER
          />
          <NumberInput
            size="sm"
            max={9999999999}
            // type="number"  VERIFY MANTINE
            placeholder="Enter 10 digit phone number"
            hideControls
            variant="unstyled"
          />
        </Group>
      </Paper>
    );
  }

  function EmailForm() {
    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter email address"
          style={{ width: "70vw", maxWidth: "400px" }}
          leftSection={<IconMail size="1.2rem" color="black" />}
          variant="unstyled"
        />
      </Paper>
    );
  }

  function RatingForm() {
    return (
      <Paper px={30} py={20} radius="lg">
        <Rating size="xl" />
      </Paper>
    );
  }

  function LDForm() {
    return (
      <Group>
        <Box w={120}>
          <Button
            color={"dark.0"}
            size="lg"
            px="md"
            fullWidth
            radius="md"
            leftSection={<IconThumbUpFilled />}
          >
            Like
          </Button>
        </Box>
        <Box w={130}>
          <Button
            color={"dark.0"}
            size="lg"
            px="md"
            radius="md"
            fullWidth
            leftSection={<IconThumbDownFilled />}
          >
            Dislike
          </Button>
        </Box>
      </Group>
    );
  }

  function OpinionScaleForm() {
    const renderButtons = () => {
      const buttons = [];
      for (let i = 1; i <= 10; i++) {
        buttons.push(
          <Button
            key={i}
            radius="xl"
            color={"blue.9"}
            variant={"default"}
            gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
          >
            {i}
          </Button>,
        );
      }
      return buttons;
    };

    return (
      <Group justify="center" gap="xs">
        {renderButtons()}
      </Group>
    );
  }

  function YNForm() {
    return (
      <Group>
        <Box w={120}>
          <Button color={"dark.0"} size="lg" px="xl" fullWidth radius="md">
            No
          </Button>
        </Box>
        <Box w={120}>
          <Button color={"dark.0"} size="lg" px="xl" radius="md" fullWidth>
            Yes
          </Button>
        </Box>
      </Group>
    );
  }

  function ImageForm() {
    const [file, setFile] = useState<File | null>(null);
    return (
      <>
        <Box w={300}>
          <FileButton
            // onChange={() => { }}
            onChange={setFile}
            accept="image/png,image/jpeg"
          >
            {(props) => (
              <Button
                fullWidth
                size="lg"
                radius="lg"
                variant="gradient"
                gradient={{ from: "#62CBE6", to: "#3F5BA9" }}
                {...props}
              >
                Upload image
              </Button>
            )}
          </FileButton>
        </Box>

        {file && (
          <Text
            size="sm"
            style={{
              textAlign: "center",
            }}
            mt="sm"
          >
            Selected file: {file.name}
          </Text>
        )}
      </>
    );
  }

  function DateForm() {
    return (
      <Paper shadow="sm" className={classes.inputBox}>
        <DateInput
          //value={response}
          // onChange={updateResponse}
          placeholder="Select date"
          maw={400}
          mx="auto"
          variant="unstyled"
          leftSection={<IconCalendarEvent size="1.2rem" color="black" />}
        />
      </Paper>
    );
  }
};

export default QuestionTypePreview;
