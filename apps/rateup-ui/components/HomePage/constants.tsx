import Link from "next/link";
import { Flex, Menu } from "@mantine/core";
import LinkWithSublinksPopover from "./components/LinkWithSublinksPopover";
import headerStyles from "./components/Header/Header.module.css";

export const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images`;

const navLinks = [
  {
    href: "/",
    linkText: "Home",
  },
  {
    href: "#our-solutions",
    linkText: "Solutions",
    hasSublinks: true,
    sublinks: [
      {
        id: 1001,
        link: "/reputation",
        content: {
          heading: "Reputation Management",
          description:
            "Offering businesses a platform to boost Google reviews and foster brand advocates.",
        },
        iconLink: `${imagesPath}/homepage/header/target.svg`,
      },
      {
        id: 1002,
        link: "/menus",
        content: {
          heading: "Digital Menu",
          description:
            "Experience quick, delicious dining with our digital menus.",
        },
        iconLink: `${imagesPath}/homepage/header/clipboard.svg`,
      },
    ],
  },
  {
    href: "#our-features",
    linkText: "Features",
  },
  {
    href: "/",
    linkText: "About Us",
  },
  {
    href: "/",
    linkText: "Blog",
  },
];

export const getNavLinksArray = (className: string, isHeader: boolean) =>
  navLinks.map(({ href, linkText, hasSublinks, sublinks }) =>
    isHeader && hasSublinks ? (
      <LinkWithSublinksPopover
        key={linkText}
        className={className}
        href={href}
        linkText={linkText}
        sublinks={sublinks}
      />
    ) : (
      <Flex className={headerStyles["header-link-wrapper"]} key={linkText}>
        <Link className={className} href={href}>
          <span>{linkText}</span>
        </Link>
      </Flex>
    ),
  );

export const getMobileNavLinkMenuItems = (className: string) =>
  navLinks.map(({ href, linkText }) => (
    <Menu.Item key={linkText}>
      <Link className={className} href={href} key={linkText}>
        {linkText}
      </Link>
    </Menu.Item>
  ));
