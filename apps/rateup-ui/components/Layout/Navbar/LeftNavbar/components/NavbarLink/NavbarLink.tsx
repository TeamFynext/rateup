import React from "react";
import { useRouter } from "next/router";

import {
  Burger,
  Divider,
  NavLink,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";

import { UserRole } from "@/utils/enums";

import { NavbarLinkProps as NavbarLinkData } from "../../../navbar.constants";

interface NavbarLinkProps {
  data: Array<NavbarLinkData>;
  opened: boolean;
  currentRole:
    | typeof UserRole.ADM
    | typeof UserRole.MEMBER
    | typeof UserRole.SUPADM
    | "...error...";
  setOpened?: React.Dispatch<React.SetStateAction<boolean>>;
  active: number;
  setActive?: React.Dispatch<React.SetStateAction<number>>;
}

function NavbarLink({
  data,
  opened,
  currentRole,
  setOpened,
  active,
  setActive,
}: NavbarLinkProps) {
  const router = useRouter();
  const { colorScheme } = useMantineColorScheme();
  const colorBasedOnLightMode = colorScheme === "light" ? "gray" : "white";
  return (
    <>
      {data.map(({ Icon, label, href, role, submenus }, parentIndex) => {
        if (role && currentRole !== role) return null;
        return (
          <Tooltip
            label={!opened ? label : ""}
            position="right"
            styles={{ tooltip: { display: opened && "none" } }}
            key={parentIndex}
          >
            <NavLink
              mt={5}
              styles={{
                children: { display: !opened && "none", marginTop: 5 },
                root: {
                  borderRadius: 5,
                },
                label: {
                  color:
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    ) && colorBasedOnLightMode,
                },
                chevron: {
                  color:
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    ) && colorBasedOnLightMode,
                },
              }}
              p={5}
              label={opened && label}
              leftSection={
                <Icon
                  size={21}
                  color={
                    !(
                      (submenus?.length > 0 && active === parentIndex) ||
                      router.pathname === href
                    )
                      ? "grey"
                      : "var(--tertiary-color)"
                  }
                />
              }
              rightSection={!opened && <Burger opened={opened} size={0} />}
              active={
                submenus?.length > 0
                  ? active === parentIndex
                  : router.pathname === href
              }
              onClick={(e) => {
                if (href) {
                  if (label == "Docs") {
                    window.open(href, "_blank");
                  } else {
                    router.push(href);
                  }
                  setActive(parentIndex);
                } else if (submenus?.length > 0) {
                  if (!opened) {
                    if (router.pathname !== submenus[0].href) {
                      router.push(submenus[0].href);
                    }
                    setOpened((o) => true);
                    setActive(parentIndex);
                  }
                }
              }}
            >
              {submenus?.length > 0 &&
                submenus.map(({ Icon, label, href, role }, index) => {
                  if (role && currentRole !== role) return null;
                  return (
                    <React.Fragment key={index}>
                      <Tooltip
                        label={!opened ? label : ""}
                        position="right"
                        styles={{ tooltip: { display: opened && "none" } }}
                      >
                        <NavLink
                          styles={{
                            children: { display: !opened && "none" },
                            root: {
                              borderRadius: 5,
                            },
                            label: {
                              color: router.pathname !== href && "gray",
                            },
                          }}
                          p={5}
                          label={opened && label}
                          leftSection={
                            <Icon
                              size={18}
                              color={
                                router.pathname !== href
                                  ? "grey"
                                  : "var(--tertiary-color)"
                              }
                            />
                          }
                          onClick={() => {
                            href && router.push(href);
                            setActive(parentIndex);
                          }}
                          active={router.pathname === href}
                        />
                      </Tooltip>
                      <Divider opacity={0.5} />
                    </React.Fragment>
                  );
                })}
            </NavLink>
          </Tooltip>
        );
      })}
    </>
  );
}

export default NavbarLink;
