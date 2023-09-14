import React, {useState, useEffect} from 'react'
import useStyles from './HomePage.styles';
import { Container, Group, Stack, Title, TextInput, Textarea, Text} from '@mantine/core';
import { RateupButtonSecondary } from '../Button/RateupButtons';
import { IconChevronRight } from '@tabler/icons-react';
import { useForm } from "@mantine/form";
import { useSendContactFormMutation } from '../../backend/homepage/homepage.query';
import { useMediaQuery } from '@mantine/hooks';

const ContactForm = () => {
  const { classes } = useStyles();

  const contactForm = useForm({
    initialValues: {
      name: "",
      email: "",
      message: "",
    },
    validate: {
      name: (value) => {
        if (value.length < 4) {
          return "Invalid input, min 4 characters";
        }
        return null; 
      },
      email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return "Invalid email";
        }
        return null;
      },
      message: (value) => {
        if (value.length < 5) {
          return "Invalid input, min 5 characters";
        }
        return null; 
      },
    },
  });

  const isMobile = useMediaQuery('(max-width: 480px)');

  const [isLoading, setIsLoading] = useState(false);
  const [viewForm, setViewForm] = useState(true)
  const sendMessage = useSendContactFormMutation(setIsLoading);

  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values.name,
      email: values.email,
      message: values.message,
    };
    sendMessage.mutate(data);
  };

  useEffect(() => {
    if(contactForm.values.name && !isLoading){
      contactForm.reset()
      setViewForm(false)
    }
  }, [isLoading])

  const transitionStyles = {
    transition: 'opacity 0.9s ease-in-out',
  };
  
  return (
    <Container fluid py="100px">
                
    <Stack className={classes.wrapContainer}> 
        <Title order={2}  size="56px" mb="md">Get in touch</Title>
       { viewForm ? <form onSubmit={contactForm.onSubmit(onSubmit)} style={transitionStyles}>

        <Group > 
                <TextInput
                    sx={{ maxWidth:  isMobile ? '100%' :'50%'}}
                    label="Name"
                    placeholder="Enter your full name"
                   {...contactForm.getInputProps("name")}
                    withAsterisk
                />

                <TextInput
                    sx={{ maxWidth:  isMobile ? '100%' :'50%' }}
                    label="Email"
                    placeholder="Enter your email"
                    withAsterisk
                    {...contactForm?.getInputProps("email")}

                />
        </Group>


        <Textarea mt="lg"
            placeholder="Enter the message"
            label="Message"
            withAsterisk
            {...contactForm?.getInputProps("message")}

            />

        <RateupButtonSecondary mt="xl" rightIcon={<IconChevronRight />} 
            sx={{maxWidth:"200px"}}
            type="submit"
            loading={isLoading}
            size="md"
            title="Send Message"/>

      </form> 
      
      : <Group> 
          <Text color='teal'> Your message is sent Successfully. Soon you will get a response from our team. Thank you.</Text>
        </Group> 
      
      
      } 

    </Stack>

</Container>
  )
}

export default ContactForm