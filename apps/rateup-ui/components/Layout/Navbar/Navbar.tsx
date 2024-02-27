import { useRouter } from "next/router";
import React from "react";
import { Breadcrumbs, Group, Text } from "@mantine/core";
import Link from "next/link";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { IconChevronRight, IconHome } from "@tabler/icons";

import styles from "./Navbar.module.css";
import { IconCrown } from "@tabler/icons-react";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import ExpiryComponent from "../../Premium/ExpiryComponent";
import { useSubscription } from "../../../backend/subscription/subscription.query";

export const Navbar = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const pathParts = pathname.split("/").filter((path) => path);
  const routeParams = useRouteParams();
  const { data: subscription, isPending } = useSubscription();
  return (
    <Group justify="space-between" pr={"lg"} h={37}>
      <Breadcrumbs
        separator={
          <IconChevronRight size={15} color="var(--mantine-color-gray-6)" />
        }
      >
        <Link href="/dashboard" className={styles["link"]}>
          <IconHome size={23} color="var(--mantine-color-gray-6)" />
        </Link>
        {pathParts.map((part, index) => {
          part = replaceRouteParameter(part, query, routeParams);
          if (part == "dashboard") return;
          return (
            <Link
              className={styles["link"]}
              href={`/${pathParts.slice(0, index + 1).join("/")}`}
              key={index}
            >
              <Text
                c={index === pathParts.length - 1 ? "blue.9" : "dark.2"}
                size={"14px"}
              >
                {part.charAt(0).toUpperCase() + part.slice(1)}
              </Text>
            </Link>
          );
        })}
      </Breadcrumbs>
      {!router.asPath.includes("/dashboard/settings?activeTab=account") && (
        <ExpiryComponent expiryDate={subscription?.expiresAt}>
          <RateupButtonPrimary
            title="Upgrade Now"
            variant="gradient"
            leftIcon={<IconCrown />}
            gradient={{ from: "#FDBD3A", to: "#F99A21" }}
            radius={"md"}
            onClick={() => router.push("/dashboard/settings?activeTab=account")}
          />
        </ExpiryComponent>
      )}
    </Group>
  );
};
function replaceRouteParameter(part, query, routeParams) {
  // Add routeParams as a parameter
  if (part.startsWith("[") && part.endsWith("]")) {
    const paramName = part.slice(1, -1);
    if (query[paramName]) {
      return routeParams?.state[paramName] || query[paramName];
    }
  }
  return part;
}
