import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

const urls = [
  { url: "/", priority: 1 },
  { url: "/pricing", priority: 0.8 },
  { url: "/contact-us", priority: 0.8 },
  { url: "/about-us", priority: 0.8 },
  { url: "/blog", priority: 0.8 },
  { url: "/products/whatsapp-loyalty", priority: 0.8 },
  { url: "/products/whatsapp-survey", priority: 0.8 },
  { url: "/login", priority: 0.8 },
  { url: "/signup", priority: 0.8 },
  { url: "/privacy-policy", priority: 0.8 },
  { url: "/terms-of-service", priority: 0.8 },
  { url: "/login/reset-password", priority: 0.64 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return urls.map(({ url, priority }) => ({
    url: `${baseUrl}${url}`,
    lastModified: new Date(),
    priority,
  }));
}
