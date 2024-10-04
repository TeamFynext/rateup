import Link from "next/link";

import { List, Stack, Text } from "@mantine/core";
import classNames from "classnames/bind";

import TextIllustration from "@/components/HomePage/components/TextIllustration";
import { imagesPath } from "@/utils/constants";

import commonStyles from "../../QrStudioPage/HeroSection/HeroSection.module.css";
import ListItemDot from "../../QrStudioPage/HeroSection/ListItemDot";
import styles from "./OurKeyFeatures.module.css";
import { whatsappIntegrationsCardsData } from "./whatsappIntegrationCardsData";

const cx = classNames.bind(styles);
const commonStylesCx = classNames.bind(commonStyles);

function OurKeyFeatures() {
  return (
    <Stack
      component={"section"}
      className={cx(
        "our-key-features-root-div",
        "landing-page-section-root-common-styles",
      )}
    >
      <h1 className={cx("heading", "landing-page-s-h-c")}>Our Key Features</h1>
      <TextIllustration
        className={cx("our-key-features-text-illustration-section")}
      >
        <Stack>
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>Feedback Collection</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Easily create and distribute feedback survey
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Detailed Analytics with NPS scores and CSAT analysis
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Improve products and services based on customer input
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Collect response via web and whatsApp in one platform
            </List.Item>
          </List>
          <Link className={cx("learn-more-link")} href={"/"}>
            Learn more
          </Link>
        </Stack>
        <>
          <picture>
            {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
            <img
              src={`${imagesPath}/homepage/our-key-features/feedback-collection.png`}
              alt="feedback collection"
              loading="lazy"
            />
          </picture>
        </>
      </TextIllustration>

      <TextIllustration
        imageAsFirstElement
        className={cx("our-key-features-text-illustration-section")}
      >
        <Stack>
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>Lead Generation</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Capture leads through customizable web and whatsApp forms
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Engage potential customer via whatsApp
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Nuture leads with automated follows-ups
            </List.Item>
          </List>
          <Link className={cx("learn-more-link")} href={"/"}>
            Learn more
          </Link>
        </Stack>
        <>
          <picture>
            {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
            <img
              src={`${imagesPath}/homepage/our-key-features/lead-generation.png`}
              alt="lead generation"
              loading="lazy"
            />
          </picture>
        </>
      </TextIllustration>

      <TextIllustration
        className={cx("our-key-features-text-illustration-section")}
      >
        <Stack className={cx("whatsapp-feedback-text-container")}>
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>WhatsApp integration</span>
          </h1>

          {whatsappIntegrationsCardsData.map(({ id, heading, description }) => {
            return (
              <Stack className={cx("w-i-card")} key={id}>
                <h2 className={cx("w-i-card-heading")}>
                  <Text
                    component="span"
                    inherit
                    variant="gradient"
                    gradient={{ from: "#387ADF", to: "#50C4ED", deg: 135 }}
                  >
                    {heading}
                  </Text>
                </h2>
                <Text>{description}</Text>
              </Stack>
            );
          })}
          <Link className={cx("learn-more-link")} href={"/"}>
            Learn more
          </Link>
        </Stack>
        <>
          <picture>
            {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
            <img
              style={{ maxHeight: "31.25rem" }}
              src={`${imagesPath}/homepage/our-key-features/whatsapp-integration.png`}
              alt="whasapp integration"
              loading="lazy"
            />
          </picture>
        </>
      </TextIllustration>

      <TextIllustration
        imageAsFirstElement
        className={cx("our-key-features-text-illustration-section")}
      >
        <Stack>
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>Landing Page Builder</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Create quick, link tree-style landing pages
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Share via link or QR code
            </List.Item>
          </List>
          <Link className={cx("learn-more-link")} href={"/"}>
            Learn more
          </Link>
        </Stack>
        <>
          <picture>
            {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
            <img
              src={`${imagesPath}/homepage/our-key-features/landing-page-builder.png`}
              alt="Landing Page Builder"
              loading="lazy"
            />
          </picture>
        </>
      </TextIllustration>

      <TextIllustration
        className={cx("our-key-features-text-illustration-section")}
      >
        <Stack>
          <h1 className={commonStylesCx("heading", cx("heading"))}>
            <span>QR Codes Generator</span>
          </h1>
          <List
            className={commonStylesCx(
              "qr-features-list",
              cx("qr-features-list"),
            )}
          >
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Create on brand, custom QR Codes for easy acess to your content
            </List.Item>
            <List.Item icon={<ListItemDot color={"var(--tertiary-color)"} />}>
              Track QR code scans and engagement
            </List.Item>
          </List>
          <Link className={cx("learn-more-link")} href={"/"}>
            Learn more
          </Link>
        </Stack>
        <>
          <picture>
            {/* <source
              type="image/webp"
              srcSet={`${imagesPath}/homepage/hero-section-img.webp`}
            /> */}
            <img
              src={`${imagesPath}/homepage/our-key-features/qr-code-generator.png`}
              alt="Landing Page Builder"
              loading="lazy"
            />
          </picture>
        </>
      </TextIllustration>
    </Stack>
  );
}

export default OurKeyFeatures;
