import React, {useEffect, useState} from "react";
import { HeaderTabs } from "../../components/Layout/Header/Header";
import { IconSend, IconArrowAutofitLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  Container,
  Title,
  Space,
  Divider,
  Text,
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Paper,
  Group,
  Button,
  Image,
  NavLink,
  Center
} from "@mantine/core";
import { useRouter } from 'next/router';
import {  useConsumeVerificationCode, useEmailSend, useSignIn, useSignUp } from "../../utils/auth";
import Link from 'next/link';
import { AuthMode, UserMode } from "../../utils/enums";
import { useForm } from "@mantine/form";
import { GoogleButton } from "../Button/SocialButtons";
import { getAuthorisationURLWithQueryParamsAndSetState } from "supertokens-web-js/recipe/thirdpartyemailpassword";
import { useCreateUserMutation } from "../../backend/user/user.query";

const AuthForm =  ({ mode, authType } : {mode: string, authType?: string | string[]}) => {

  const router = useRouter();
  const { token, rid } = router.query;
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();

  useEffect(() => {
    if (mode === AuthMode.VERIFY) {
      if (token && rid==="emailverification") {
        consumeVerificationCode()
        console.log(rid)
      }else{
        sendEmail(); 
      }
    }
  }, [mode, token, sendEmail, consumeVerificationCode, rid]); // add dependencies here
  
  const signIn = useSignIn();
  const signUp = useSignUp(); 

  const [isLoading, setIsLoading] = useState(false);

  const createUserMutation = useCreateUserMutation(setIsLoading);

  const isLogin = mode === AuthMode.LOGIN;


    const loginForm = useForm({
      initialValues: {
          email: "",
          password: "",
      },
  
      validate: {
          email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
          password: (value) => {
            if (!value) {
              return 'Password is required';
            }
            if (value.length < 5) {
              return 'Password should be at least 5 characters long';
            }
            if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
              return 'Password should contain at least one letter and one number';
            }
            return null; // Validation passed
          },
        },
    });
    
  const signUpForm = useForm({
      initialValues: {
        email: "",
        password: "",
        name: "",
        orgName: "",
        inviteCode: "",
      },
    
      validate: {
        email: (value) => (/^\S+@\S+$/.test(value) ? null : ( authType ? null : 'Invalid email' )),
        password: (value) => {
          if(authType){
            return null;
          }  else{
            if (!value) {
              return 'Password is required';
            }
            if (value.length < 5) {
              return 'Password should be at least 5 characters long';
            }
            if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
              return 'Password should contain at least one letter and one number';
            }
            return null; // Validation passed
          }
            
        },
        name: (value) => {
          if (value.length < 4) {
            return 'Name should be at least 4 characters long';
          }
          return null; // Validation passed
        },
        orgName: (value) => {
          if (value.length < 4) {
            return 'Organization name should be at least 4 characters long';
          }
          return null; // Validation passed
        },
        inviteCode: (value) => {
          if (value.length < 5) {
            return 'Invalid invite code';
          }
          return null; // Validation passed
        },
      },
    });

  const onSubmit = isLogin
  ? (values) => {
      setIsLoading(true);
      signIn(values.email, values.password).finally(() => {
        setIsLoading(false);
      });
    }
  : (
    authType ?

    (values) => {
      setIsLoading(true);
      const data =  { name : values.name, orgName : values.orgName, inviteCode : values.inviteCode };
      createUserMutation.mutate(data);
    }

    :
    
    (values) => {
      setIsLoading(true);
      signUp(values.email, values.password, values.name, values.orgName, values.inviteCode ).finally(() => {
        setIsLoading(false);
      });
    }
    
    )

    async function googleSignInClicked() {
      try {
          const authUrl = await getAuthorisationURLWithQueryParamsAndSetState({
              providerId: "google",
  
              // This is where Google should redirect the user back after login or error.
              // This URL goes on the Google's dashboard as well.
              authorisationURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/login/callback/google`,
          });
  
          /*
          Example value of authUrl: https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&include_granted_scopes=true&response_type=code&client_id=1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com&state=5a489996a28cafc83ddff&redirect_uri=https%3A%2F%2Fsupertokens.io%2Fdev%2Foauth%2Fredirect-to-app&flowName=GeneralOAuthFlow
          */
  
          // we redirect the user to google for auth.
          window.location.assign(authUrl);
      } catch (err: any) {
          if (err.isSuperTokensGeneralError === true) {
              // this may be a custom error message sent from the API by you.
            //window.alert(err.message);
            notifications.show({
              id: 'load-data',
              color: 'red',
              title: 'Error',
              message: err.message,
              icon: <IconX size="1rem" />,
              autoClose: 3000,
            });
          } else {
            //window.alert("Oops! Something went wrong.");
            notifications.show({
              id: 'load-data',
              color: 'red',
              title: 'Error',
              message: "Oops! Something went wrong..." + err,
              icon: <IconX size="1rem" />,
              autoClose: 3000,
            });
          }
      }
  }

  return (
    <>
      <HeaderTabs mode={UserMode.GUEST} />
      <Space h="lg" />
      {mode !== AuthMode.VERIFY ?

      <Container size={420} my={40}>

      {
            authType  ?
      <Title
          align="center"
          sx={(theme) => ({
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900,
          })}
        >
          Complete Signup Process
        </Title>
        :
        <>
        <Title
          align="center"
          sx={(theme) => ({
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900,
          })}
        >
          {isLogin ? "Welcome back!" : "Create your account!"}
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          {isLogin ? (
            <>Do not have an account yet?{" "}
            <Anchor size="sm" component="button">
             

              <Link href='/signup'>
                 Create account
                </Link>
            </Anchor></>
          ) : (
            <>Already have an account?{" "}
            <Anchor size="sm" component="button">
              <Link href='/login'>
              Log in
                </Link>
            </Anchor></>
          )}
        </Text>

        </>

      }

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={isLogin ? loginForm.onSubmit(onSubmit) : signUpForm.onSubmit(onSubmit) }>
          {
            !authType  && 
            <>
              <Group grow mb="md" pb="md" mt="md" onClick={googleSignInClicked}>
                 <GoogleButton radius="xl" >Continue with Google</GoogleButton>
              </Group>
              <Divider label="Or continue with email" labelPosition="center" my="xl" />
           </>
          }
        {isLogin ?
          <>
          <TextInput
            withAsterisk
            label="Email"
            placeholder="your@email.com"
            {...loginForm.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...loginForm.getInputProps('password')}
            mt="md"
          />
          <Group position="apart" mt="lg">
            <Checkbox label="Remember me" />
            <Anchor component="button" size="sm">
              {isLogin ? <Link href='/login/reset-password'>
              Forgot password?
                </Link> : "Forgot email?"}
            </Anchor>
          </Group>
          </>
          :
          <>
            <TextInput
                withAsterisk
                label="Name"
                placeholder="Enter your name"
                {...signUpForm.getInputProps('name')}
              />
            <TextInput
              withAsterisk
              label="Organization Name"
              placeholder="Enter company name"
              {...signUpForm.getInputProps('orgName')}
              mt="md"
            />
            {!authType &&

                <>
                  <TextInput
                    withAsterisk
                    label="Email"
                    placeholder={"your@email.com"}
                    {...signUpForm.getInputProps('email')}
                    mt="md"
                  />

                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...signUpForm.getInputProps('password')}
                  mt="md"
                />
                </>

                }
            <TextInput
              withAsterisk
              label="Invite Code"
              placeholder="Enter invitation code"
              {...signUpForm.getInputProps('inviteCode')}
              mt="md"
            />
          </>
        }
          <Button fullWidth mt="xl" type="submit" loading ={isLoading}>
            {isLogin ? "Sign in" : ( authType ? "Finish SignUp" : "Sign up")}
          </Button>
          </form>

{authType &&
  <Center  mt="xl">
          <Text  mt="xl" inline color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              <Link href="/auth/logout" style={{ textDecoration: 'none', }}>
                <NavLink
                  label="Logout"
                  icon={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
                  variant="subtle"
                />
              </Link>
            </Text>

            </Center>

}
        </Paper>
      </Container>

      :

      <Container  size={420} my={40}>
        <Paper withBorder shadow="lg" p={30} mt={30} radius="md">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/email.svg`} alt="RateUp Logo" width={90} height={60} />
            <Space h="lg" />
            <Title>Verify your email address</Title>
            <Space h="md" />
            <Text>Please click on the link in the email we just sent you to confirm your email address.</Text>
            <Space h="lg" />
            <Space h="xl" />

            <Text color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              onClick={sendEmail}>
                  <NavLink
                  label="Resend or change email"
                  icon={<IconSend size="1rem" stroke={1.5} />}
                  rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
                  variant="subtle"
                />
              </Text>

            <Text inline color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              <Link href="/auth/logout" style={{ textDecoration: 'none', }}>
                <NavLink
                  label="Logout"
                  icon={<IconArrowAutofitLeft size="1rem" stroke={1.5} />}
                  variant="subtle"
                />
              </Link>
            </Text>
        </Paper>
      </Container>

      }
    </>
  );
};

export default AuthForm;
