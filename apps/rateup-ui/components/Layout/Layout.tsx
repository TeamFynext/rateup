import React, { useEffect, useState } from "react";
import { Flex, Transition } from "@mantine/core";
import { HeaderTabs } from "./Header/Header";
import {
  IUserInfoApiResponse,
  fetchUserInfo,
} from "../../backend/user/user.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../context/UserContext";
import { RouteParamsProvider } from "../../context/RouteParamsContext";
import SessionAuth from "../SuperToken/SessionAuth";
import { useRouter } from "next/router";
import useLocalStorage from "../../hooks/localStorage";
import LeftNavbar from "./Navbar/LeftNavbar";
import FocusMode from "../Switch/Focusmode";
import styles from "./Layout.module.css";
// @ts-ignore
export default function Layout({ children }) {
  const router = useRouter();
  const [opened, setOpened] = useState(true);
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
  } = useQuery<IUserInfoApiResponse>({
    queryKey: ["userInfoQuery"],
    queryFn: fetchUserInfo,
    notifyOnChangeProps: ["data"],
    enabled: !userInfo, // fetch only if there is no data in localStorage
  });

  useEffect(() => {
    if (userQueryData?.data) {
      setUserInfo(userQueryData); // update localStorage
    }
    if (userQueryData?.data?.email && !userQueryData?.data?.orgId) {
      if (router.query.msg !== "welcome") {
        router.push("/signup?auth=google");
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
                opened={opened}
                setOpened={setOpened}
                style={transitionStyle}
              />
            )}
          </Transition>
          <Flex direction={"column"} w={"100%"} gap="15px">
            <Transition mounted={!focus} transition="slide-down">
              {(transitionStyle) => (
                <HeaderTabs opened={opened} style={transitionStyle} />
              )}
            </Transition>
            <Flex
              className={`${styles.notinfocus} ${focus && styles.focus}`}
              style={{ overflow: "scroll" }}
              px="lg"
              py="sm"
              direction="column"
              m="auto"
            >
              {children}
            </Flex>
          </Flex>
          <FocusMode focus={focus} toggleFocus={toggleFocus} />
        </Flex>
      </RouteParamsProvider>
    </SessionAuth>
  );
}
