import Link from "next/link";
import { Flex, Menu, NavLink } from "@mantine/core";
import LinkWithSublinksPopover from "./components/LinkWithSublinksPopover";
import headerStyles from "./components/Header/Header.module.css";
import navLinkStyles from "./components/Header/MobileNavDrawer/NavLink.module.css";

export const imagesPath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images`;
export const rateupLogoBlueTextUrl = `${imagesPath}/rateup-logo-blue-text.svg`;
export const rateupLogoWhiteTextUrl = `${imagesPath}/rateup-logo-white-text.svg`;
export const rateupLogoUrl = rateupLogoBlueTextUrl;

const headerNavLinks = [
  {
    href: "/",
    linkText: "Home",
  },
  {
    href: "/#our-solutions",
    linkText: "Solutions",
    hasSublinks: true,
    sublinks: [
      {
        id: 1001,
        link: "/reputation-management",
        content: {
          heading: "Reputation Management",
          description:
            "Offering businesses a platform to boost Google reviews and foster brand advocates.",
        },
        iconLink: `${imagesPath}/homepage/header/target.svg`,
      },
      {
        id: 1002,
        link: "/digital-menu",
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
    href: "/#our-features",
    linkText: "Features",
  },
  {
    href: "/about-us",
    linkText: "About Us",
  },
  {
    href: "/pricing",
    linkText: "Pricing",
  },
  {
    href: "/blog",
    linkText: "Blog",
  },
];

const ourCompanySectionLinks = [
  ...headerNavLinks.filter((obj) => obj.linkText !== "Pricing"),
];
const blogLink = ourCompanySectionLinks.splice(4, 1, {
  href: "/contact-us",
  linkText: "Contact Us",
});

export const footerNavLinks = {
  "our-company": {
    heading: "Our Company",
    linksArray: [...ourCompanySectionLinks, ...blogLink],
  },
  pricing: {
    heading: "Pricing",
    linksArray: [
      {
        href: "/pricing",
        linkText: "Pricing",
      },
    ],
  },
  legal: {
    heading: "Legal",
    linksArray: [
      {
        href: "/privacy-policy",
        linkText: "Privacy Policy",
      },
      {
        href: "/terms-of-service",
        linkText: "Terms of Service",
      },
    ],
  },
};

// [
//   ...headerNavLinks,
//   {
//     href: "/terms-of-service",
//     linkText: "Terms of Service",
//   },
//   {
//     href: "/privacy-policy",
//     linkText: "Privacy Policy",
//   },
//   {
//     href: "/shipping-and-delivery",
//     linkText: "Shipping and Delivery",
//   },
//   {
//     href: "/cancellation-and-refund",
//     linkText: "Cancellation and Refund",
//   },
//   {
//     href: "/contact-us",
//     linkText: "Contact Us",
//   }
// ];

export const getNavLinksArray = (className: string) => {
  const navLinks = headerNavLinks;
  return navLinks.map(({ href, linkText, hasSublinks, sublinks }) =>
    hasSublinks ? (
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
};

export const getMobileNavLinkMenuItems = (className: string = "") =>
  headerNavLinks.map(({ href, linkText, hasSublinks, sublinks }) => (
    <Menu.Item key={linkText} component="div">
      {hasSublinks ? (
        <NavLink
          href={href}
          label={linkText}
          className={navLinkStyles["navlink-with-chevron"]}
          classNames={navLinkStyles}
        >
          {sublinks.map(({ id, link, content }) => {
            return (
              <NavLink
                key={id}
                label={content.heading}
                href={link}
                component={Link}
                classNames={navLinkStyles}
                className={className}
              />
            );
          })}
        </NavLink>
      ) : (
        <Link className={className} href={href} key={linkText}>
          {linkText}
        </Link>
      )}
    </Menu.Item>
  ));
