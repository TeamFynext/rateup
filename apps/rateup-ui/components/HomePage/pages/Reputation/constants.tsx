import Image from "next/image";
import styles from "../../index/index.module.css";
import { Text, Title } from "@mantine/core";

export type Solution = {
  heading: string;
  description: string;
  imageUrl: string;
  listIcons?: {
    enabledIcon: string;
    disabledIcon: string;
  };
};

export const solutionsList: Solution[] = [
  {
    heading: "Enhanced Brand Credibility",
    description:
      "Track and manage what customers are saying about your business online. Respond to reviews, address concerns, and showcase the best of what your customers love about you.",
    imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/why-choose-rateup.png`,
    listIcons: {
      enabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/credibility.png`,
      disabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/credibility-disabled.png`,
    },
  },
  {
    heading: "Data-Driven Decision Making",
    description:
      "Leverage insights from our AI-driven analytics to make informed decisions for business improvement.",
    imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/why-choose-rateup.png`,
    listIcons: {
      enabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/decision-making.png`,
      disabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/decision-making-disabled.png`,
    },
  },
  {
    heading: "Proactive Issue Resolution",
    description:
      "Identify and resolve customer concerns in real-time, showcasing a commitment to exceptional customer service.",
    imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/why-choose-rateup.png`,
    listIcons: {
      enabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/issue-resolution.png`,
      disabledIcon: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/why-choose-rateup/list-icons/issue-resolution-disabled.png`,
    },
  },
];

const featuresH1ClassName = styles["illustration-txt-section-heading"];
const descriptionPClassName = styles["illustration-txt-section-text-para"];
const descriptionPSpanClassName = styles["bold-span"];

const Heading = ({ children }) => (
  <Title order={1} className={featuresH1ClassName}>
    {children}
  </Title>
);

const DescriptionP = ({ children }) => (
  <Text className={descriptionPClassName}>{children}</Text>
);

const DescriptionPSpan = ({ text }) => (
  <span className={descriptionPSpanClassName}>{text}</span>
);

const imagePath = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/reputation-page/our-features`;
const videoClassName = styles["illustration-txt-section-video"];

export const features = [
  {
    id: 10245,
    heading: (
      <Heading>
        <span>RateUp to boost your Google reviews.</span>
        <span>Google Review Enhancement</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Our platform strategically encourages satisfied customers to share their
        positive experiences, organically improving your online presence and{" "}
        <DescriptionPSpan text="establishing a strong digital footprint." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/google-review-enhancement.png`}
        width={662}
        height={482}
        alt="Google Review Enhancement"
      />
    ),
  },
  {
    id: 10246,
    heading: (
      <Heading>
        <span>Transforming Customers into Brand Advocates</span>
        <span>AI-Based Algorithm</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Experience the difference with our{" "}
        <DescriptionPSpan text="AI-based algorithm" />, intelligently
        identifying and engaging happy customers. By converting satisfied
        clients into brand advocates, <DescriptionPSpan text="RateUp" /> ensures
        a genuine and compelling endorsement, significantly enhancing your{" "}
        <DescriptionPSpan text="brand's credibility and perceived value." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/ai-based-algorithm.png`}
        width={1982}
        height={1443}
        alt="AI-Based Algorithm"
      />
    ),
  },
  {
    id: 10247,
    heading: (
      <Heading>
        <span>RateUp goes beyond the surface</span>
        <span>Customer Feedback Insights</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Uncover Areas for Improvement RateUp goes beyond the surface, offering
        businesses a comprehensive understanding of customer sentiment. Uncover
        the specifics of what pleases or dissatisfies your customers, empowering
        you with actionable insights to{" "}
        <DescriptionPSpan text="enhance overall customer satisfaction." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/customer-feedback-insights.png`}
        width={1982}
        height={1443}
        alt="Customer Feedback Insights"
      />
    ),
  },
  {
    id: 10248,
    heading: (
      <Heading>
        <span>Resolve Issues Swiftly and Effectively</span>
        <span>Escalation Mechanism</span>
      </Heading>
    ),
    description: (
      <DescriptionP>
        Identify and address customer concerns promptly with{" "}
        <DescriptionPSpan text="RateUp's built-in escalation mechanism." /> Gain
        insights into the root causes of dissatisfaction and seamlessly escalate
        issues to the concerned teams or departments, ensuring a swift
        resolution and demonstrating{" "}
        <DescriptionPSpan text="a commitment to customer-centricity." />
      </DescriptionP>
    ),
    image: (
      <Image
        className={videoClassName}
        src={`${imagePath}/escalation-mechanism.png`}
        width={1982}
        height={1443}
        alt="Escalation Mechanism"
      />
    ),
  },
];
