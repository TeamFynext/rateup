import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import { ActionIcon, Box, Flex, Transition } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconMenu2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames/bind";
import { AnimatePresence, motion } from "motion/react";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "../../backend/org/ws/org.ws.api";
import { useOrgWsAuthCheck } from "../../backend/org/ws/org.ws.query";
import { IUserInfoApiResponse } from "../../backend/user/user.api";
import { useUserInfo } from "../../backend/user/user.query";
import { NavControlContext } from "../../context/NavControlContext";
import { RouteParamsProvider } from "../../context/RouteParamsContext";
import { useUser, useWsData } from "../../context/UserContext";
import useLocalStorage from "../../hooks/localStorage";
import { useNotifyWsMessages } from "../../hooks/useNotifyWsMessages";
import { orgWsMessage } from "../../types/global";
import ReportBug from "../ReportBug";
import SessionAuth from "../SuperToken/SessionAuth";
import FocusMode from "../Switch/Focusmode";
import { HeaderTabs } from "./Header/Header";
import styles from "./Layout.module.css";
import LeftNavbar from "./Navbar/LeftNavbar";
import navBarStyles from "./Navbar/Navbar.module.css";

const navbarCx = classNames.bind(navBarStyles);

// @ts-ignore
export default function Layout({ children, appProps }) {
  const router = useRouter();
  const notifyWsMessages = useNotifyWsMessages();
  const connectionRef = useRef<WebSocket | null>(null);
  const isViewPortLEQ768px = useMediaQuery("(max-width: 768px)");
  const [navOpened, setNavOpened] = useState(true);
  const [focus, toggleFocus] = useState(false);
  const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );
  const { setUser } = useUser();
  const { setWsData } = useWsData();
  const queryClient = useQueryClient();
  const {
    isLoading: isLoadingUserInfo,
    data: userQueryData,
    error: errorUserInfo,
    refetch,
  } = useUserInfo();

  const { data, error } = useOrgWsAuthCheck();

  useEffect(() => {
    if (data && !error) {
      connectionRef.current = new WebSocket(
        `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${data?.afterAuthId}`,
      );

      connectionRef.current.onopen = () => {
        console.log("Connected to websocket");
      };

      connectionRef.current.onmessage = (event) => {
        const newMessage: orgWsMessage = JSON.parse(event.data);
        setWsData(newMessage);
        notifyWsMessages(newMessage);
      };

      connectionRef.current.onclose = () => {
        console.log("Disconnected from websocket");
      };

      return () => {
        connectionRef.current?.close();
      };
    }
  }, [data, setWsData]);

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

    if (userInfo?.data?.isOrgPaused)
      router.push(`/login/callback/paused?pausedby=rateup`);
    if (userInfo?.data?.isPaused)
      router.push(
        `/login/callback/paused?pausedby=${userInfo?.data?.pausedBy}`,
      );
    const shopifySetUpFinishRoute = localStorage.getItem(
      "shopify-auth-callback",
    );
    if (shopifySetUpFinishRoute) router.push(shopifySetUpFinishRoute);

    const shopifySubscriptionReturn = localStorage.getItem(
      "shopify-subscription-callback",
    );
    if (shopifySubscriptionReturn) router.push(shopifySubscriptionReturn);

    if (userInfo === null)
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
  }, [userInfo]);

  useEffect(() => {
    if (isViewPortLEQ768px && navOpened) {
      setNavOpened(false);
    } else {
      setNavOpened(true);
    }
  }, [isViewPortLEQ768px]);

  useEffect(() => {
    const handleRouteChange = (url, { shallow }) => {
      if (isViewPortLEQ768px && navOpened) {
        setNavOpened(false);
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router, isViewPortLEQ768px, navOpened]);

  return (
    <SessionAuth>
      <RouteParamsProvider>
        <Flex className={styles["dashboard-layout-root-div"]}>
          <LeftNavbar
            opened={navOpened}
            setOpened={setNavOpened}
            focus={focus}
          />

          <Box className={styles["mobile-hamburger-icon-div"]}>
            <ActionIcon
              className={navbarCx(
                "burger-btn-for-mobile",
                "chevron-burger-btn",
                { "navbar-closed": !navOpened },
              )}
            >
              <IconMenu2
                onClick={() => {
                  setNavOpened((o) => !o);
                }}
              />
            </ActionIcon>
          </Box>

          <motion.div className={styles["content-container"]}>
            <Transition mounted={!focus} transition="slide-down">
              {(transitionStyle) =>
                !isViewPortLEQ768px ? (
                  <HeaderTabs opened={navOpened} style={transitionStyle} />
                ) : (
                  <Box h={60}></Box>
                )
              }
            </Transition>
            <Flex className={`${styles["content-wrapper"]}`}>
              <NavControlContext.Provider value={{ navOpened, setNavOpened }}>
                <AnimatePresence key={appProps.router.pathname}>
                  <motion.div
                    className={styles["content-div"]}
                    initial={
                      !(
                        appProps.router.pathname.includes("login") ||
                        appProps.router.pathname.includes("signup")
                      ) && { opacity: 0 }
                    }
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </NavControlContext.Provider>
            </Flex>
          </motion.div>
          <FocusMode
            focus={focus}
            toggleFocus={(value) => {
              toggleFocus(value);
              setNavOpened(!navOpened);
            }}
          />
          <ReportBug />
        </Flex>
      </RouteParamsProvider>
    </SessionAuth>
  );
}
