"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ActionIcon, Breadcrumbs, Flex, Group, Text } from "@mantine/core";
import {
  IconChevronRight,
  IconCrown,
  IconHeadset,
  IconHome,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useCurrentPath } from "@/hooks/currentPath";

import { useSubscription } from "../../../backend/subscription/subscription.query";
import { useRouteParams } from "../../../context/RouteParamsContext";
import LanguageSelector from "../../Button/LanguageSelector";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import ExpiryComponent from "../../Premium/ExpiryComponent";
import ColorSchemaButton from "../../theme/ColorSchemaButton";
import styles from "./Navbar.module.css";

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const translations = useTranslations();
  let pathParts = pathname.split("/").filter((path) => path);
  const routeParams = useRouteParams();
  const { data: subscription, isPending } = useSubscription();
  const getUrl = (index, data) => {
    let paramName = data;
    if (data.startsWith("[") && data.endsWith("]")) {
      paramName = data.slice(1, -1);
    }
    return data.startsWith("[") && data.endsWith("]")
      ? `/${pathParts?.slice(0, index + 1)?.join("/")}/${query?.[paramName]}`
      : `/${pathParts?.slice(0, index + 2)?.join("/")}`;
  };

  const paths = pathParts
    ?.slice(1)
    ?.map((data, index) => ({
      title: replaceRouteParameter(data, query, routeParams),
      href: getUrl(index, data),
    }))
    .filter((item) => !["v1", "v2"].includes(item.title));

  const items = paths?.map((item, index) => (
    <Link href={item.href} key={index} className={styles.breadcrumbsLink}>
      <Text
        size={"14px"}
        c={
          index === pathParts.length - 2
            ? "var(--mantine-primary-color-filled)"
            : "dark.2"
        }
        tt={"capitalize"}
      >
        {item.title}
      </Text>
    </Link>
  ));
  const excludePath =
    paths?.length === 1 && ["tickets"].includes(paths[0].title);
  const currentRoutePath = useCurrentPath();
  if (excludePath) return;
  return (
    <Group className={styles["navbar-root-div"]}>
      <Breadcrumbs
        className={styles["breadcrumbs"]}
        separator={
          <IconChevronRight size={15} color="var(--mantine-color-gray-6)" />
        }
      >
        <Link href="/dashboard">
          <IconHome size={23} color="var(--mantine-color-gray-6)" />
        </Link>
        {items}
      </Breadcrumbs>
      {/* 
        Below tabs container is currently being used in web SurveyId Component, to render tabs of that page here using portal
      */}
      <Flex
        id={"tabs-container-entity-editor-tabs"}
        className={styles["tabs-container"]}
      >
        {/* Tabs will be rendered here */}
      </Flex>
      <Group
        className={styles["language-selector-and-other-options-container"]}
      >
        {!currentRoutePath.includes("/dashboard/settings/billing") && (
          <ExpiryComponent expiryDate={subscription?.expiresAt}>
            <RateupButtonPrimary
              title={translations("Upgrade Now")}
              variant="gradient"
              leftIcon={<IconCrown />}
              gradient={{ from: "#FDBD3A", to: "#F99A21" }}
              radius={"md"}
              onClick={() => router.push("/dashboard/settings/billing")}
            />
          </ExpiryComponent>
        )}
        <LanguageSelector />
        <ActionIcon
          variant="light"
          size={"lg"}
          onClick={() => {
            router.push("https://wa.me/919744668658?text=support");
          }}
        >
          <IconHeadset />
        </ActionIcon>
      </Group>
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
