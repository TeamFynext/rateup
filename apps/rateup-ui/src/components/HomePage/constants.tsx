import { Flex, Menu, NavLink } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { rateupLogoStackedTransparent } from "@/utils/constants";

import headerStyles from "./components/Header/Header.module.css";
import navLinkStyles from "./components/Header/MobileNavDrawer/NavLink.module.css";
import LinkWithSublinksPopover from "./components/LinkWithSublinksPopover/index.tsx";

export const imagesPath = `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images`;
export const rateupLogoUrl = rateupLogoStackedTransparent;

const headerNavLinks = [
  {
    href: "/#platform",
    linkText: "Platform",
    hasSublinks: true,
    sublinks: [
      {
        id: 1004,
        link: "/whatsapp-feedback",
        content: {
          heading: "Whatsapp Feedback",
          description: "Engage where your customer are most active",
        },
        iconLink: `${imagesPath}/homepage/header/whatsapp-icon.svg`,
      },
      {
        id: 1005,
        link: "/web-survey",
        content: {
          heading: "Web Survey",
          description:
            "Effortlessly collect and analyze customer insights with web survey",
        },
        iconLink: `${imagesPath}/homepage/header/desktop-icon.svg`,
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
      {
        id: 1006,
        link: "/product-packaging-qr",
        content: {
          heading: "Product Packaging QR",
          description:
            "Transform product packaging into a customer engagement hub with smart QR codes",
        },
        iconLink: `${imagesPath}/homepage/header/package.svg`,
      },
      {
        id: 1003,
        link: "/qr-studio",
        content: {
          heading: "QR Studio",
          description: "One smart QR code, Endless Possibilities",
        },
        iconLink: `${imagesPath}/qr-studio-page/qr-studio-icon.png`,
      },
    ],
  },
  {
    href: "/pricing",
    linkText: "Pricing",
  },
  {
    href: "/#resources",
    linkText: "Resources",
    hasSublinks: true,
    sublinks: [],
  },
  {
    href: "/about-us",
    linkText: "About Us",
  },
  {
    href: "/blog",
    linkText: "Blog",
  },
];

const excludedOurCompanySectionLinks = ["/pricing", "/#platform"];
const ourCompanySectionLinks = [
  ...headerNavLinks.filter(
    (obj) => !excludedOurCompanySectionLinks.includes(obj.href),
  ),
];
const blogLink = ourCompanySectionLinks.splice(2, 1, {
  href: "/contact-us",
  linkText: "Contact Us",
});

const footerNavLinks = {
  "our-company": {
    heading: "Our Company",
    linksArray: [...ourCompanySectionLinks, ...blogLink],
  },
  product: {
    heading: "Pricing",
    linksArray: [
      {
        href: "/pricing",
        linkText: "Basic Plan",
      },
      {
        href: "/pricing",
        linkText: "Plus Plan",
      },
      {
        href: "/pricing",
        linkText: "Premium Plan",
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

const getNavLinksArray = (className: string, currentRoutePath: string) => {
  const navLinks = headerNavLinks;
  return navLinks.map(({ href, linkText, hasSublinks, sublinks }) => {
    const isLinkActive =
      currentRoutePath === href ||
      sublinks?.find((obj) => obj.link === currentRoutePath);
    const linkActiveClassName = isLinkActive ? "link-active" : "";
    const requiredClassName = `${className} ${linkActiveClassName}`;
    return hasSublinks ? (
      <LinkWithSublinksPopover
        key={linkText}
        className={requiredClassName}
        href={href}
        linkText={linkText}
        sublinks={sublinks}
      />
    ) : (
      <Flex className={headerStyles["header-link-wrapper"]} key={linkText}>
        <Link className={requiredClassName} to={href}>
          <span>{linkText}</span>
        </Link>
      </Flex>
    );
  });
};

const getMobileNavLinkMenuItems = (
  className: string = "",
  currentRoutePath: string,
) =>
  headerNavLinks.map(({ href, linkText, hasSublinks, sublinks }) => {
    const isLinkActive =
      currentRoutePath === href ||
      sublinks?.find((obj) => obj.link === currentRoutePath);
    const linkActiveClassName = isLinkActive ? "link-active" : "";
    const requiredClassName = `${className} ${linkActiveClassName}`;

    return (
      <Menu.Item key={linkText} component="div">
        {hasSublinks ? (
          <NavLink
            href={href}
            label={linkText}
            className={`${navLinkStyles["navlink-with-chevron"]} ${linkActiveClassName}`}
            classNames={navLinkStyles}
          >
            {sublinks.map(({ id, link, content }) => {
              const linkActiveClassName =
                currentRoutePath === link ? "link-active" : "";
              return (
                <NavLink
                  key={id}
                  label={content.heading}
                  to={link}
                  component={Link}
                  classNames={navLinkStyles}
                  className={`${className} ${linkActiveClassName}`}
                />
              );
            })}
          </NavLink>
        ) : (
          <Link className={requiredClassName} to={href} key={linkText}>
            {linkText}
          </Link>
        )}
      </Menu.Item>
    );
  });
