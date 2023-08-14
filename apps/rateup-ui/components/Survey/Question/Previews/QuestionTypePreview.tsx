import React, { useState, forwardRef } from 'react'
import {
    QuestionType as Q,
    SmileyResponse,
} from "../../../../types/enums";
import {
    Button, NumberInput,
    FileButton, Select,
    Group,
    Rating,
    Text, Avatar,
    TextInput, Paper, Input,
    Box, Image, Textarea
} from "@mantine/core";
import { useStyles } from '../../TakeSurvey/TakeSurvey.styles';
import { IconMail, IconThumbDownFilled, IconThumbUpFilled } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { IconCalendarEvent } from '@tabler/icons-react';

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
                    placeholder="Enter text input"
                    sx={{ width: '70vw', maxWidth: "400px" }}
                    variant="unstyled"
                    radius="xl"
                    size="sm"
                />
            </Paper>

        );
    }

    function TextAreaForm() {
        const { classes } = useStyles();

        return (
            <Paper shadow="sm"
                className={classes.inputBox}
            >

            <Textarea
                        placeholder="Enter multiline text input"
                        sx={{ maxWidth: "400px" }}
                        variant="unstyled"
                        radius="xl"
                        size="sm"
                    />
            </Paper>

        );
    }

    function NumberForm() {
        const { classes } = useStyles();
      
        return (
          <Paper shadow="sm"
              className={classes.inputBox}
            >
            <NumberInput
                size="sm"
                type="number"
                placeholder="Enter number input"
                variant="unstyled"
              />
          </Paper>
      
        );
      }

      function PhoneForm() {
        const { classes } = useStyles();
     
        const data = [
          {
            image: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/flag_india.png`,
            label: '+91',
            value: '91',
            description: 'India',
          },
      
        ];
      
        interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
          image: string;
          label: string;
          description: string;
        }
        
        const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
          ({ image, label, description, ...others }: ItemProps, ref) => (
            <div ref={ref} {...others}>
              <Group noWrap>
                <Avatar src={image} sx={{minWidth: "50px"}}/>
                <div>
                  <Text size="sm">{label}</Text>
                  <Text size="xs" opacity={0.65}>
                    {description}
                  </Text>
                </div>
              </Group>
            </div>
          )
        );
        
        return (
          <Paper shadow="sm"
              className={classes.inputBox}
            >
              <Group>
              <Select
                sx={{maxWidth: "140px"}}
                placeholder="Select Country Code"
                itemComponent={SelectItem}
                data={data}
                searchable
                maxDropdownHeight={400}
                defaultValue={data[0].value}
                nothingFound="No results"
                filter={(value, item) =>
                  item.label.toLowerCase().includes(value.toLowerCase().trim()) ||
                  item.description.toLowerCase().includes(value.toLowerCase().trim())
                }
              />
               <NumberInput
                size="sm"
                max={9999999999}
                type="number"
                placeholder="Enter 10 digit phone number"
                hideControls
                variant="unstyled"
              />
              </Group>
    
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
                    sx={{ width: '70vw', maxWidth: "400px" }}
                    icon={<IconMail size="1.2rem" color="black" />}
                    variant="unstyled"
                />
            </Paper>
        );
    }


    function RatingForm() {
        return <Paper px={30} py={20} radius="lg">
            <Rating
                size="xl" /></Paper>;
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
                        leftIcon={<IconThumbUpFilled />}
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
                        leftIcon={<IconThumbDownFilled />}
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
                        size="lg"
                        px="xl"
                        fullWidth
                        radius="md"
                    >
                        No
                    </Button>
                </Box>
                <Box w={120}>

                    <Button
                        color={"dark.0"}
                        size="lg"
                        px="xl"
                        radius="md"
                        fullWidth
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
                        gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
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