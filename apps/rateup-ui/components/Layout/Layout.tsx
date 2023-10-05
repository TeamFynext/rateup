import React, { useEffect, useState } from "react";
import { useMantineTheme, Flex } from "@mantine/core";
import { HeaderTabs } from "./Header/Header";
import {
  IUserInfoApiResponse,
  fetchUserInfo,
} from "../../backend/user/user.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../context/UserContext";
import LeftNavbar from "./Navbar/LeftNavbar";
import { RouteParamsProvider } from "../../context/RouteParamsContext";
import SessionAuth from "../SuperToken/SessionAuth";
import { useRouter } from "next/router";
import useLocalStorage from "../../hooks/localStorage";

// @ts-ignore
export default ({ children }) => {
  const theme = useMantineTheme();
  const router = useRouter();
  const [opened, setOpened] = useState(false);

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

    if (userInfo === null) queryClient.invalidateQueries(["userInfoQuery"]);
  }, [userInfo]);

  return (
    <SessionAuth>
      <RouteParamsProvider>
        <Flex direction={"row"} h={"100vh"}>
          <LeftNavbar opened={opened} setOpened={setOpened} />
          <Flex direction={"column"} w={"100%"}>
            <HeaderTabs opened={opened} />
            <Flex
              h="100%"
              style={{ overflowY: "auto" }}
              p="xl"
              direction="column"
              maw={"1500px"}
              m="auto"
              w="100%"
            >
              {children}
            </Flex>
          </Flex>
        </Flex>
      </RouteParamsProvider>
    </SessionAuth>
  );
};
