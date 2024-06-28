import { Breadcrumbs, Group, Text } from "@mantine/core";
import { IconChevronRight, IconCrown, IconHome } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useRouteParams } from "../../../context/RouteParamsContext";
import styles from "./Navbar.module.css";
import { useSubscription } from "../../../backend/subscription/subscription.query";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import ExpiryComponent from "../../Premium/ExpiryComponent";
import ColorSchemaButton from "../../theme/ColorSchemaButton";
import Link from "next/link";

export const Navbar = () => {
  const router = useRouter();
  const { pathname, query } = router;
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
  const items = pathParts
    ?.slice(1)
    ?.map((data, index) => ({
      title: replaceRouteParameter(data, query, routeParams),
      href: getUrl(index, data),
    }))
    ?.map((item, index) => (
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
  return (
    <Group justify="space-between" h={37}>
      <Breadcrumbs
        separator={
          <IconChevronRight size={15} color="var(--mantine-color-gray-6)" />
        }
      >
        <Link href="/dashboard">
          <IconHome size={23} color="var(--mantine-color-gray-6)" />
        </Link>
        {items}
      </Breadcrumbs>
      {process.env.NEXT_PUBLIC_EXPERIMENT && <ColorSchemaButton />}
      {!router.asPath.includes("/dashboard/settings?activeTab=account") && (
        <ExpiryComponent expiryDate={subscription?.expiresAt}>
          <RateupButtonPrimary
            title="Upgrade Now"
            variant="gradient"
            leftIcon={<IconCrown />}
            gradient={{ from: "#FDBD3A", to: "#F99A21" }}
            radius={"md"}
            onClick={() =>
              router.push("/dashboard/settings?activeTab=account&view=billing")
            }
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
