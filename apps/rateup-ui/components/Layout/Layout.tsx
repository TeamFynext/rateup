import React, { useEffect, useState } from "react";
import { Flex, Transition } from "@mantine/core";
import { HeaderTabs } from "./Header/Header";
import { IUserInfoApiResponse } from "../../backend/user/user.api";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../context/UserContext";
import { RouteParamsProvider } from "../../context/RouteParamsContext";
import SessionAuth from "../SuperToken/SessionAuth";
import { useRouter } from "next/router";
import useLocalStorage from "../../hooks/localStorage";
import LeftNavbar from "./Navbar/LeftNavbar";
import FocusMode from "../Switch/Focusmode";
import ReportBug from "../ReportBug";
import styles from "./Layout.module.css";
import { useUserInfo } from "../../backend/user/user.query";
import { NavControlContext } from "../../context/NavControlContext";
import ChatBot from "../../pages/dashboard/chatbot";
// @ts-ignore
export default function Layout({ children }) {
  const router = useRouter();
  const [navOpened, setNavOpened] = useState(true);
  const [focus, toggleFocus] = useState(false);
  const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );
  const { setUser } = useUser();
  const queryClient = useQueryClient();
  const {
    isLoading: isLoadingUserInfo,
    data: userQueryData,
    error: errorUserInfo,
    refetch,
  } = useUserInfo();

  if (router.query.msg === "welcome") {
    refetch();
  }

  useEffect(() => {
    if (userQueryData && "data" in userQueryData) {
      if (userQueryData?.data) {
        setUserInfo(userQueryData); // update localStorage
      }
      if (userQueryData?.data?.email && !userQueryData?.data?.orgId) {
        if (router.query.msg !== "welcome") {
          router.push("/signup?auth=google");
        }
      }
    } else if (userQueryData && "error" in userQueryData) {
      if (userQueryData?.error?.message === "Google User missing in Rateup") {
        console.error("Google User missing in Rateup");
        if (router.query.msg !== "welcome") {
          // welcome is to avoid repeatation of push
          router.push("/signup?auth=google");
        }
      } else if (userQueryData?.error?.message === "User missing in Rateup") {
        console.error("User missing in Rateup");
        //TODO : handle case of email user missing signup in rateup db
      }
    }

    if (!userQueryData) {
      refetch();
    }
  }, [userQueryData]);

  useEffect(() => {
    setUser(userInfo?.data);

    if (userInfo === null)
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
  }, [userInfo]);

  return (
    <SessionAuth>
      <RouteParamsProvider>
        <Flex direction={"row"} h={"100vh"}>
          <Transition mounted={!focus} transition="slide-right">
            {(transitionStyle) => (
              <LeftNavbar
                opened={navOpened}
                setOpened={setNavOpened}
                style={transitionStyle}
              />
            )}
          </Transition>
          <Flex
            className={styles["content-container"]}
            direction={"column"}
            gap="15px"
            // if we want to change bg color of /dashboard/ urls
            // bg={
            //   router?.pathname?.toLowerCase().startsWith("/dashboard/menu/")
            //     ? "var(--bg-grey-color)"
            //     : "initial"
            // }
          >
            <Transition mounted={!focus} transition="slide-down">
              {(transitionStyle) => (
                <HeaderTabs opened={navOpened} style={transitionStyle} />
              )}
            </Transition>
            <Flex
              className={`${styles.notinfocus} ${focus && styles.focus}`}
              style={{ overflow: "auto" }}
              px="lg"
              py="sm"
              pt={0}
              direction="column"
              m="auto"
            >
              <NavControlContext.Provider value={{ navOpened, setNavOpened }}>
                {children}
              </NavControlContext.Provider>
            </Flex>
          </Flex>
          {/* <ChatBot/> */}
          <FocusMode focus={focus} toggleFocus={toggleFocus} />
          <ReportBug />
        </Flex>
      </RouteParamsProvider>
    </SessionAuth>
  );
}
