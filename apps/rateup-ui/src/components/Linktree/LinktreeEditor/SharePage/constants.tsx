const socialMediaLinks = [
  {
    id: "email",
    iconSrc: `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/mail.svg`,
    alt: "mail icon",
    tooltipLabel: "Share via Email",
    link: `mailto:?subject=Survey&body=Take a minute to complete the survey: `,
  },
  {
    id: "whatsapp",
    iconSrc: `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/whatsapp.svg`,
    alt: "whatsapp icon",
    tooltipLabel: "Share via Whatsapp",
    link: `https://web.whatsapp.com/send?text=Take a minute to complete the survey: `,
  },
  {
    id: "facebook",
    iconSrc: `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/social-media-icons/facebook.svg`,
    alt: "facebook icon",
    tooltipLabel: "Share via Facebook",
    link: `https://www.facebook.com/sharer/sharer.php?u=`,
  },
  {
    id: "iframe",
    iconSrc: `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/iframe-icon.png`,
    alt: "iframe icon",
    tooltipLabel: "Embed as iframe",
  },
];

const getLink = (id: string, link: string, linktreeTitle: string, shareUrl: string) => {
  switch (id) {
    case "email": {
      return `${link}\n ${linktreeTitle} \n${shareUrl} \n\n`;
    }
    case "whatsapp": {
      return `${link} \n${shareUrl}`;
    }
    case "facebook": {
      return `${link}${shareUrl}`;
    }
    case "iframe": {
      return "iframe";
    }
  }
};

export { socialMediaLinks, getLink };
