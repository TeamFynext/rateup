"use client";

import {
  Box,
  Center,
  ScrollArea,
  Stack,
  useMantineColorScheme,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { rateupLogoUrl } from "../HomePage/constants.tsx";
import styles from "./login-signup-layout.module.css";

function LoginSignupLayout({ children }) {
  const { colorScheme } = useMantineColorScheme();

  return (
    <Center h={"100vh"}>
      <Stack
        align="center"
        w={{ base: "100%", sm: "100%", lg: "70%" }}
        py={"lg"}
        gap={50}
      >
        <Link to="/">
          <Image src={rateupLogoUrl} alt="RateUp Logo" width={85} height={85} />
        </Link>
        <Box
          className={`${styles[`color-scheme-${colorScheme}`]} rounded-xl`}
          p={"xl"}
          w={{ base: "90%", sm: "90%", xl: "70%", "2xl": "50%" }}
        >
          <ScrollArea
            className={styles["scroll-area-div"]}
            h={"100%"}
            w={"100%"}
            scrollbarSize={5}
            type="hover"
          >
            {children}
          </ScrollArea>
        </Box>
      </Stack>
      {/* <LoginSignupDecorativeImage /> */}
    </Center>
  );
}

export default LoginSignupLayout;
