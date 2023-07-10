import React, { useState } from 'react'
import {
    QuestionType as Q,
    SmileyResponse,
} from "../../../../types/enums";
import {
    Button,
    FileButton,
    Group,
    Rating,
    Text,
    TextInput, Paper, Input,
    Box, Image
} from "@mantine/core";
import { useStyles } from '../../TakeSurvey/TakeSurvey.styles';
import { IconMail, IconThumbDownFilled, IconThumbUpFilled } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { IconCalendarEvent } from '@tabler/icons-react';

const QuestionTypePreview = ({ type }) => {

    switch (type) {
        case Q.Text:
        case Q.Phone:
            return <TextForm />;
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
            return <SmileyForm />;
        case Q.Photo:
            return <ImageForm />;
        case Q.MCQ:
            return null;
        case Q.MSQ:
            return null;
        case Q.Testimonial:
            return null;
        case Q.DateTime:
            return <DateForm />;
        default:
            return <div>not implemented</div>;
    }

    function TextForm() {
        const { classes } = useStyles();

        return (
            <Paper shadow="sm"
                className={classes.inputBox}
            >
                <Input
                    placeholder="Enter your answer"
                    //value={response || ""}
                    //onChange={(e) => updateResponse(e.currentTarget.value)}
                    sx={{ width: '70vw', maxWidth: "400px" }}
                    variant="unstyled"
                    radius="xl"
                    size="sm"
                />
            </Paper>

        );
    }

    function EmailForm() {
        const { classes } = useStyles();
        return (
            <Paper shadow="sm"
                className={classes.inputBox}
            >
                <TextInput
                    placeholder="Enter email address"
                    // value={response || ""}
                    //  onChange={handleInputChange}
                    //  onBlur={handleInputBlur}
                    sx={{ width: '70vw', maxWidth: "400px" }}
                    //   error={emailError && !isFocused ? 'Invalid email' : null}
                    icon={<IconMail size="1.2rem" color="black" />}
                    variant="unstyled"
                />
            </Paper>
        );
    }


    function RatingForm() {
        return <Paper px={30} py={20} radius="lg">
            <Rating
                //value={response} 
                //onChange={updateResponse} 
                size="xl" /></Paper>;
    }

    function LDForm() {
        return (
            <Group>
                <Box w={120}>
                    <Button
                        // color={response === LDResponse.Like ? "yellow" : "dark.0"}
                        color={"dark.0"}
                        size="lg"
                        px="md"
                        fullWidth
                        radius="md"
                        leftIcon={<IconThumbUpFilled />}
                    // onClick={() => updateResponse(LDResponse.Like)}
                    >
                        Like
                    </Button>
                </Box>
                <Box w={130}>

                    <Button
                        color={"dark.0"}
                        // color={response === LDResponse.Dislike ? "yellow" : "dark.0"}
                        size="lg"
                        px="md"
                        radius="md"
                        fullWidth
                        leftIcon={<IconThumbDownFilled />}
                    //onClick={() => updateResponse(LDResponse.Dislike)}
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
                        //onClick={() => updateResponse(i)}
                        //color={response === i ? 'blue' : 'blue.9'}
                        // variant={response === i ? 'gradient' : 'default'}

                        color={'blue.9'}
                        variant={'default'}
                        gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
                    >
                        {i}
                    </Button>
                );
            }
            return buttons
        }

        return (
            <Group position="center" spacing="xs">
                {renderButtons()}
            </Group>
        );
    }

    function YNForm() {
        return (
            <Group>
                <Box w={120}>
                    <Button
                        color={"dark.0"}
                        //color={response === YNResponse.No ? "yellow" : "dark.0"}
                        size="lg"
                        px="xl"
                        fullWidth
                        radius="md"
                    // onClick={() => updateResponse(YNResponse.No)}
                    >
                        No
                    </Button>
                </Box>
                <Box w={120}>

                    <Button
                        color={"dark.0"}
                        // color={response === YNResponse.Yes ? "yellow" : "dark.0"}
                        size="lg"
                        px="xl"
                        radius="md"
                        fullWidth
                    // onClick={() => updateResponse(YNResponse.Yes)}
                    >
                        Yes
                    </Button>
                </Box>
            </Group>
        );
    }


    function SmileyForm() {
        const SMILEY_OPTIONS = Object.entries(SmileyResponse).map(([type, value]) => ({
            value: type,
            label: value,
        }));
        return (
            <Group>
                {SMILEY_OPTIONS.map(({ value, label }) => (
                    <Button
                        key={value}
                        variant={"default"}
                        //variant={response === value ? "gradient" : "default"}
                        gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
                        //  onClick={() => updateResponse(value)}
                        sx={{ height: '90px', width: '90px' }}
                    >
                        {/* <Stack> */}
                        <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/smileys/${value}.png`} width={50} height={50} />
                        {/* <Text> {label}</Text>
      
                </Stack> */}

                    </Button>
                ))}
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
                        accept="image/png,image/jpeg">
                        {(props) => <Button fullWidth size="lg" radius="lg"
                            variant="gradient" gradient={{ from: '#62CBE6', to: '#3F5BA9' }}{...props}>Upload image</Button>}
                    </FileButton>
                </Box>

                {file && (
                    <Text size="sm" align="center" mt="sm">
                        Selected file: {file.name}
                    </Text>
                )}
            </>
        );
    }

    function DateForm() {
        const { classes } = useStyles();
        return (
            <Paper shadow="sm"
                className={classes.inputBox}
            >
                <DateInput
                    //value={response}
                    // onChange={updateResponse}
                    placeholder="Select date"
                    maw={400}
                    mx="auto"
                    variant="unstyled"
                    icon={<IconCalendarEvent size="1.2rem" color="black" />}

                />
            </Paper>
        );
    }

}

export default QuestionTypePreview