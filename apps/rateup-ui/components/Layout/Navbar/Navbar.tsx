import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { Breadcrumbs, Flex, Text, Menu, Container } from "@mantine/core";
import Link from "next/link";
import { useRouteParams } from "../../../context/RouteParamsContext";
import { IconChevronRight, IconHome, IconChevronDown } from "@tabler/icons";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import LoggedInUserCard from "./LoggedInUserCard";
import { useUser } from "../../../context/UserContext";
import styles from "./Navbar.module.css";
import { useNavBottomData, NavbarLinkProps } from "./navbar.constants";

export const Navbar = ({ name, role, image, email }) => {
  const router = useRouter();
  const { pathname, query } = router;
  const pathParts = pathname.split("/").filter((path) => path);
  const routeParams = useRouteParams();
  const navBottomData = useNavBottomData();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user } = useUser();
  const [userProfileAvatar, setUserProfileAvatar] = useState(
    `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/user.png`,
  );

  useEffect(() => {
    if (user?.profilePhoto && user?.profilePhoto !== "REMOVED_PHOTO") {
      const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${user?.profilePhoto}`;
      setUserProfileAvatar(imgUrl);
    } else {
      setUserProfileAvatar(
        `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/profile-photo.png`,
      );
    }
  }, [user]);

  const handleItemClick = (item: NavbarLinkProps) => {
    if (item.label === "Admin") {
      router.push(`/admin`);
    } else if (item.label === "Settings") {
      router.push(`/dashboard/settings`);
    } else if (item.label === "Logout") {
      router.push(`/logout`);
    }
  };

  const handlePaperLayoutClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <Flex>
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
      <Container className={styles["image-user-icon-container"]}>
        <Menu shadow="md" width={200} position="bottom">
          <Menu.Target>
            <PaperLayout
              w={"fit-content"}
              p={2}
              hoveractive
              radius={"md"}
              style={{
                alignItems: "right",
                justifyContent: "right",
                display: "flex",
                position: "relative",
              }}
              onClick={handlePaperLayoutClick}
            >
              <Flex
                justify={"space-between"}
                className={styles["Logged-in-user-card"]}
              >
                <LoggedInUserCard />
                {isDropdownOpen ? (
                  <IconChevronDown style={{ marginTop: "1rem" }} />
                ) : (
                  <IconChevronRight style={{ marginTop: "1rem" }} />
                )}
              </Flex>
            </PaperLayout>
          </Menu.Target>
          <Menu.Dropdown
            className={styles["dropdown-menu"]}
            style={{ width: "250px" }}
          >
            <Menu.Label>Manage your Account</Menu.Label>
            {navBottomData.map((item, index) => (
              <Menu.Item key={index} onClick={() => handleItemClick(item)}>
                <Flex style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
                  {item.Icon && <item.Icon size={30} />}
                  <Text style={{ fontSize: "20px", marginLeft: "1rem" }}>
                    {item.label}
                  </Text>
                </Flex>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Container>
    </Flex>
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
