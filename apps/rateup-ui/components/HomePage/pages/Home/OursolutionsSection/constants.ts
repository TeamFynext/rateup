// export const solutionsList = [
//   {
//     id: "102231",
//     heading: "Online Reputation Management",
//     description:
//       "Track and manage what customers are saying about your business online. Respond to reviews, address concerns, and showcase the best of what your customers love about you.",
//     imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/our-solutions/online-reputation.png`,
//   },
//   {
//     id: "102232",
//     heading: "WhatsApp-First Feedback Collection",
//     description:
//       "Seamlessly obtain individualized feedback from your customers on WhatsApp. Our user-friendly platform ensures a streamlined and bespoke engagement, enriching the experience for both businesses and their cherished customers.",
//     imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/our-solutions/whatsapp-first.png`,
//   },
//   {
//     id: "102233",
//     heading: "Loyalty",
//     description:
//       "Delight your dedicated customers with personalized offers and incentives. Our platform empowers you to pinpoint and connect with your most loyal clientele, guaranteeing their consistent return.",
//     imageUrl: `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/homepage/our-solutions/loyalty.png`,
//   },
// ];

import { imagesPath } from "../../../../../utils/constants";

export const solutionsList = [
  {
    id: "120341",
    heading: {
      badgeText: "Encryptions",
      text: "Security-Conscious Businesses",
    },
    imageAsFirstElement: false,
    description:
      "End-to-end encryption enhances customer experience by securing sensitive data, ensuring compliance,and building trust. It gives security-conscious businesses a competitive edge.",
    img: {
      src: `${imagesPath}/homepage/our-solutions/encryptions.png`,
      alt: "encryptions",
      width: 856,
      height: 614,
    },
  },
  {
    id: "120342",
    heading: {
      badgeText: "Integrations",
      text: "Build Your Business with Integrations",
    },
    imageAsFirstElement: true,
    description:
      "Our software seamlessly integrates with internal CRM systems, streamlining datamanagement, optimizing internal data use, and increasing productivity andprofitability through a more efficient workflow.",
    img: {
      src: `${imagesPath}/homepage/our-solutions/integrations.png`,
      alt: "integrations",
      width: 795,
      height: 763,
    },
  },
];
