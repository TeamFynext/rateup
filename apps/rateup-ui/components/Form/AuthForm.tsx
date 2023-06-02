import React, {useEffect} from "react";
import { HeaderTabs } from "../../components/Layout/Header/Header";
import {
  Container,
  Title,
  Space,
  Text,
  TextInput,
  PasswordInput,
  Checkbox,
  Anchor,
  Paper,
  Group,
  Button,
  Image
} from "@mantine/core";
import { useRouter } from 'next/router';
import { useForm } from "@mantine/form";
import {  useConsumeVerificationCode, useEmailSend, useSignIn, useSignUp } from "../../utils/auth";
import Link from 'next/link';

const AuthForm = ({ mode }) => {

  const router = useRouter();
  const { token, rid } = router.query;
  const consumeVerificationCode = useConsumeVerificationCode();
  const sendEmail = useEmailSend();

  useEffect(() => {
    if (mode === "VERIFY") {
      if (token && rid==="emailverification") {
        consumeVerificationCode()
        console.log(rid)
      }else{
        sendEmail(); 
      }
    }
  }, [mode, token, sendEmail, consumeVerificationCode, rid]); // add dependencies here
  
  const form = useForm({
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

  const signIn = useSignIn();
  const signUp = useSignUp(); 

  const isLogin = mode === "LOGIN";

  const onSubmit = isLogin
    ? (values) => signIn(values.email, values.password)
    : (values) => signUp(values.email, values.password);

  return (
    <>
      <HeaderTabs mode={"GUEST"} />
      <Space h="lg" />
      {mode !=="VERIFY" ?

      <Container size={420} my={40}>
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

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(onSubmit)}>
          <TextInput
            withAsterisk
            label="Email"
            placeholder="your@email.com"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...form.getInputProps('password')}
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
          <Button fullWidth mt="xl" type="submit">
            {isLogin ? "Sign in" : "Sign up"}
          </Button>
          </form>
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
            <Text color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              onClick={sendEmail}>Resend Email</Text>
            <Space h="md" />
            <Text color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            <Link href="/auth/logout" style={{ textDecoration: 'none', }}>
                 Logout
            </Link>
            </Text>
        </Paper>
      </Container>

      }
    </>
  );
};

export default AuthForm;
