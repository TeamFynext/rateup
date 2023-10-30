import Link from "next/link";
import { Menu } from "@mantine/core";

const navLinks = [
  {
    href: "#",
    linkText: "Home",
  },
  {
    href: "#",
    linkText: "Solutions",
  },
  {
    href: "#",
    linkText: "Features",
  },
  {
    href: "#",
    linkText: "About Us",
  },
  {
    href: "#",
    linkText: "Blog",
  },
];

export const getNavLinksArray = (className: string) =>
  navLinks.map(({ href, linkText }) => (
    <Link className={className} href={href} key={linkText}>
      {linkText}
    </Link>
  ));

export const getMobileNavLinkMenuItems = (className: string) =>
  navLinks.map(({ href, linkText }) => (
    <Menu.Item key={linkText}>
      <Link className={className} href={href} key={linkText}>
        {linkText}
      </Link>
    </Menu.Item>
  ));
