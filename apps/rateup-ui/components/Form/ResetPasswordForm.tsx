import React, {useEffect, useState} from "react";
import { HeaderTabs } from "../../components/Layout/Header/Header";
import {
  Container,
  Title,
  Space,
  Text,
  TextInput,
  PasswordInput,
  Anchor,
  Paper,
  Group,
  Button,
  Image
} from "@mantine/core";
import { useRouter } from 'next/router';
import { useForm } from "@mantine/form";
import Link from 'next/link';
import { useSendResetEmail, useSetNewPassword } from "../../utils/auth/resetPassword";

const ResetPasswordForm = ({ mode }) => {

  const router = useRouter();
  const { token, rid, requestStatus, emailTo } = router.query;
  const [page, setPage] = useState(token && rid==="emailpassword" ? "STEP_THREE" : mode)


  useEffect(() => {
      if (token && rid) {
        setPage("STEP_THREE")
      }else{
        if(requestStatus === 'success'){
            setPage("STEP_TWO")
            console.log("Activating page 2")
          }else{
            setPage("STEP_ONE")
          }
      }

  }, [mode, token, rid, requestStatus, router]); 
  
  const emailForm = useForm({
    initialValues: {
        email: "",
        password: "",
    },

    validate: {
        email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      },
  });


  const pwdForm = useForm({
    initialValues: {
        password: "",
        confirmPassword: "",
    },

    validate: {
        password: (value, values) => {
            if (!value) {
              return 'Password is required';
            }
            if (value.length < 5) {
              return 'Password should be at least 5 characters long';
            }
            if (!/\d/.test(value) || !/[a-zA-Z]/.test(value)) {
              return 'Password should contain at least one letter and one number';
            }
            if (values.confirmPassword && value !== values.confirmPassword) {
              return 'Passwords do not match';
            }
            return null; 
          },
        confirmPassword: (value, values) => {
            if (!value) {
              return 'Confirm password is required';
            }
            if (value !== values.password) {
              return 'Passwords do not match';
            }
            return null; 
          },
        },
  });

const sendResetEmail = useSendResetEmail();
const setNewPassword = useSetNewPassword();

const isEmailPage = page === "STEP_ONE";
const [isLoading, setIsLoading] = useState(false);

const onSubmit = isEmailPage
  ? (values) => {
      setIsLoading(true);
      sendResetEmail(values.email).finally(() => {
        setIsLoading(false);
      });
    }
  : (values) => {
      setIsLoading(true);
      setNewPassword(values.confirmPassword).finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <HeaderTabs mode={"GUEST"} />
      <Space h="lg" />
      {page !=="STEP_TWO" ?

      <Container size={420} my={40}>
        <Title
          align="center"
          sx={(theme) => ({
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900,
          })}
        >
          {page !== "STEP_THREE" ? "Reset your Password!" : "Create new password!"}
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          {isEmailPage ? (
            <>We will send you an email to reset your password.
            </>
          ) : (
            <>Enter your new password and confirm{" "}
           </>
          )}
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={isEmailPage ?  emailForm.onSubmit(onSubmit) : pwdForm.onSubmit(onSubmit)}>
          
        {
        isEmailPage ?
          <TextInput
            withAsterisk
            label="Email"
            placeholder="your@email.com"
            {...emailForm.getInputProps('email')}
          />

          :
          <>
           <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                {...pwdForm.getInputProps('password')}
                mt="md"
            /> 

            <PasswordInput
                label="Confirm Password"
                placeholder="Your password again"
                required
                {...pwdForm.getInputProps('confirmPassword')}
                mt="md"
            /> 
            </>
        }

          <Button fullWidth mt="xl" type="submit"  loading ={isLoading}>
            {isEmailPage ? "Email Reset Link" : "Change Password"}
          </Button>
          <Group position="apart" mt="lg">
            {/* <Checkbox label="Remember me" /> */}
            <Anchor component="button" size="sm">
               <Link href='/login'>
              Go Back to Login
                </Link> 
            </Anchor>
          </Group>
          </form>

        </Paper>
      </Container>

      :

      <Container  size={420} my={40}>
        <Paper withBorder shadow="lg" p={30} mt={30} radius="md">
            <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/email.svg`} alt="RateUp Logo" width={90} height={60} />
            <Space h="lg" />
            <Title>Check your email</Title>
            <Space h="md" />
            <Text>A password reset email has been sent to {emailTo} . If it exists in our system. </Text>
            <Text color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              ><Link href="/login/reset-password" style={{ textDecoration: 'none', }}>
              Resend or change email
              </Link></Text>
            <Space h="md" />
            <Text color="blue.6" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            <Link href="/login" style={{ textDecoration: 'none', }}>
                 Go to Login
            </Link>
            </Text>
        </Paper>
      </Container>

      }
    </>
  );
};

export default ResetPasswordForm;
