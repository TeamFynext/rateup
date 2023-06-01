import React from "react";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useSignIn, useSignUp } from "../../utils/auth";
import Link from 'next/link';

const AuthForm = ({ mode }) => {
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
  const signUp = useSignUp(); // Use the hooks here

  const isLogin = mode === "LOGIN";

  const onSubmit = isLogin
    ? (values) => signIn(values.email, values.password)
    : (values) => signUp(values.email, values.password);

  return (
    <>
      <HeaderTabs mode={"GUEST"} />
      <Space h="lg" />

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
              {isLogin ? "Forgot password?" : "Forgot email?"}
            </Anchor>
          </Group>
          <Button fullWidth mt="xl" type="submit">
            {isLogin ? "Sign in" : "Sign up"}
          </Button>
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default AuthForm;
