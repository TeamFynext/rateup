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
import { useSignIn } from "../../utils/auth/login"; // Import the hook here

const index = () => {
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

  const signIn = useSignIn(); // Use the hook here

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
          Welcome back!
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          Do not have an account yet?{" "}
          <Anchor size="sm" component="button">
            Create account
          </Anchor>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit((values) => signIn(values.email, values.password))}>
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
              Forgot password?
            </Anchor>
          </Group>
          <Button fullWidth mt="xl" type="submit">
            Sign in
          </Button>
          </form>

        </Paper>
      </Container>
    </>
  );
};

export default index;
