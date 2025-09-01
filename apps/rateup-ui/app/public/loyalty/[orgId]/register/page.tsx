"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Center, Modal, Stack, Text, Title } from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import { isValidPhoneNumber } from "react-phone-number-input";

import { useCreateLoyaltyCustomerMutation } from "@/backend/loyalty/customer/customer.query";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const CustomerRegister = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 960px)");
  const [error, setError] = useState(null);
  const [opened, { open, close }] = useDisclosure();

  const params = useParams();
  const orgId = params.orgId as string;

  //register error
  const [isError, setIsError] = useState(false);

  const createCustomerMut = useCreateLoyaltyCustomerMutation();

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
    },
    validate: {
      name: isNotEmpty("required"),
      phone: (value) =>
        !value || !isValidPhoneNumber(value) ? "Invalid Phone number" : null,
    },
  });

  const handleRegister = () => {
    if (isError) setIsError(null);
    if (form.validate().hasErrors) {
      if (form.validate().errors.phone) setError(form.validate().errors.phone);
      return;
    }

    createCustomerMut.mutate(
      { orgId, ...form.values },
      {
        onSuccess: () => {
          form.reset();
          open();
        },
        onError: () => {
          setIsError(true);
          open();
        },
      },
    );
  };

  useEffect(() => {
    setError(null);
  }, [form.values.phone]);

  return (
    <Center h={"100vh"} bg={"var(--shade-of-blue)"}>
      <PaperLayout w={isMobile ? "80%" : isTablet ? "60%" : "40%"} py={60}>
        <Title order={2} ta={"center"}>
          Customer Registration
        </Title>
        <Stack justify="center" align="center" pt={"lg"}>
          <Stack m={"lg"} w={isMobile ? "90%" : "70%"}>
            <ContainedTextField
              label="Name"
              required
              withAsterisk
              {...form.getInputProps("name")}
            />
            <PhoneInputWithCountry
              withAsterisk={true}
              label="Phone Number"
              {...form.getInputProps("phone")}
              error={error}
            />
            <ContainedTextField
              label="Email"
              {...form.getInputProps("email")}
            />
            <Center>
              <RateupButtonBlue
                title="Register"
                w={"80%"}
                onClick={handleRegister}
                loading={createCustomerMut.isPending}
              />
            </Center>
          </Stack>
        </Stack>
      </PaperLayout>

      <Modal
        title=""
        opened={opened}
        onClose={close}
        centered
        withCloseButton={false}
        radius={"xl"}
        transitionProps={{ transition: "slide-up" }}
      >
        <Stack justify="center" align="center">
          {isError ? (
            <>
              <IconCircleXFilled color="red" size={"5rem"} />
              <Text>
                Something went wrong! Please check all the information
              </Text>
            </>
          ) : (
            <>
              <IconCircleCheckFilled color="green" size={"5rem"} />
              <Text>You have successfully registered</Text>
            </>
          )}
          <RateupButtonBlue
            title={isError ? "Try again" : "Register another"}
            onClick={close}
          />
        </Stack>
      </Modal>
    </Center>
  );
};

export default CustomerRegister;
