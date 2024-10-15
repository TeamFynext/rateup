import Image from "next/image";

import classNames from "classnames/bind";

import textIllustrationStyles from "@/components/HomePage/components/TextIllustration/TextIllustration.module.css";

import LightBlueGradientBg from "../../components/LightBlueGradientBg";
import { imagesPath } from "../../constants";

const tIStyles = classNames.bind(textIllustrationStyles);

const Heading = ({ gradientBgSpanText, normalText = "" }) => {
  return (
    <h1 className={tIStyles("heading-h1", "ti-heading-h1")}>
      <LightBlueGradientBg
        className={tIStyles("gradient-bg-span", "ti-gradient-bg-span")}
      >
        {gradientBgSpanText}
      </LightBlueGradientBg>
      <span>{normalText}</span>
    </h1>
  );
};

const textIllustrationSections = [
  {
    id: "35353531",
    heading: (
      <Heading
        gradientBgSpanText={"Engage Directly, Convert Faster"}
        normalText={"with rateup"}
      />
    ),
    description: (
      <p className={tIStyles("desc-p")}>
        Tap into the power of direct communication with{" "}
        <span className={tIStyles("bold-span")}>
          Rateup's WhatsApp Campaigns.
        </span>{" "}
        Reach your audience where they are and enjoy higher engagement and
        conversion rates. With customizable messaging and seamless integration,
        connecting with your customers has never been easier.
      </p>
    ),
    image: (
      <Image
        src={`${imagesPath}/homepage/whatsapp-campaigns.png`}
        alt="Whatsapp Campaigns"
        width={1031}
        height={1056}
        priority
      />
    ),
  },
  {
    id: "35353532",
    heading: (
      <Heading
        gradientBgSpanText={"Real Voices, Real Impact"}
        normalText={"with rateup"}
      />
    ),
    description: (
      <p className={tIStyles("desc-p")}>
        Let our satisfied customers speak for us. Discover the real experiences
        and success stories shared by our valued clients. Their words echo the
        effectiveness of Rateup in transforming businesses and fostering trust.
      </p>
    ),
    image: (
      <Image
        src={`${imagesPath}/homepage/satisfied-customers.png`}
        alt="Satisfied Customers"
        width={1096}
        height={879}
      />
    ),
  },
  {
    id: "35353533",
    heading: (
      <Heading
        gradientBgSpanText={"Build your business"}
        normalText={"with Integrations"}
      />
    ),
    description: (
      <p className={tIStyles("desc-p")}>
        Our software seamlessly integrates with internal CRM systems,
        streamlining datamanagement, optimizing internal data use, and
        increasing productivity andprofitability through a more efficient
        workflow.
      </p>
    ),
    image: (
      <Image
        src={`${imagesPath}/homepage/integrations.png`}
        alt="Integrations"
        width={1059}
        height={1017}
      />
    ),
  },
  {
    id: "35353534",
    heading: <Heading gradientBgSpanText={"Security conscious Business"} />,
    description: (
      <p className={tIStyles("desc-p")}>
        End-to-end encryption enhances customer experience by securing sensitive
        data, ensuring compliance,and building trust. It gives
        security-conscious businesses a competitive edge.
      </p>
    ),
    image: (
      <Image
        src={`${imagesPath}/homepage/security-conscious-business.png`}
        alt="Security Conscious Business"
        width={1108}
        height={725}
      />
    ),
  },
];

const aIAnalyticsAndInsightsContent = {
  heading: (
    <Heading
      gradientBgSpanText={"Ai Analytics & insights"}
      normalText={"with Rateup"}
    />
  ),
  description: (
    <p className={tIStyles("desc-p", "ti-desc-p")}>
      Leverage the power of our advanced AI models and analytics to gain
      actionable insights. Uncover sentiment analysis, sentiment trends, and
      customer behavior patterns for informed decision-making.
    </p>
  ),
  image: (
    <Image
      src={`${imagesPath}/homepage/ai-analytics.png`}
      alt="Ai Analytics and insights"
      width={1344}
      height={789}
    />
  ),
};

export { textIllustrationSections, aIAnalyticsAndInsightsContent };
