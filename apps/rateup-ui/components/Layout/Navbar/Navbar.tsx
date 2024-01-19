import { useRouter } from "next/router";
import { Breadcrumbs, Image, Text } from "@mantine/core";
import Link from "next/link";
import classes from "./Navbar.module.css";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { IconChevronRight, IconHome } from "@tabler/icons";
export const Navbar = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const pathParts = pathname.split("/").filter((path) => path);
  const routeParams = useRouteParams();

  return (
    <Breadcrumbs
      separator={
        <IconChevronRight size={15} color="var(--mantine-color-gray-6)" />
      }
    >
      <Link href="/dashboard" className={classes.link}>
        <IconHome size={23} color="var(--mantine-color-gray-6)" />
      </Link>
      {pathParts.map((part, index) => {
        part = replaceRouteParameter(part, query, routeParams);
        if (part == "dashboard") return;
        return (
          <Link
            className={classes.link}
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
  );
};

// function replaceRouteParameter(part, query) {
//   if (part.startsWith('[') && part.endsWith(']')) {
//     const paramName = part.slice(1, -1);
//     if (query[paramName]) {
//       return query[paramName];
//     }
//   }
//   return part;
// }

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
