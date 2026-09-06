import { createFileRoute } from "@tanstack/react-router";

import type { Post } from "@/lib/posts.ts";
import { getPosts } from "@/lib/posts.ts";

export const Route = createFileRoute("/(marketing)/blog/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";

          // `full` — the feed embeds the post body, which the list projection drops.
          const posts = await getPosts(undefined, "full");

          if (!posts?.length) {
            return new Response("No posts available", {
              status: 404,
              headers: { "Content-Type": "application/xml" },
            });
          }

          const xml = generateRSSFeed(posts.slice(0, 20), baseUrl);

          return new Response(xml, {
            headers: {
              "Content-Type": "application/rss+xml; charset=utf-8",
              "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
          });
        } catch {
          return new Response("Internal Server Error", {
            status: 500,
            headers: { "Content-Type": "application/xml" },
          });
        }
      },
    },
  },
});

function generateRSSFeed(posts: Post[], baseUrl: string) {
  const blogUrl = `${baseUrl}/blog`;

  const items = posts
    .map((post) => {
      const url = `${blogUrl}/${post.slug}`;
      const date = new Date(post.published_at).toUTCString();
      const author = post.primary_author?.name || "RateUp Blog";
      const description = post.custom_excerpt || stripHtml(post.html) || "";

      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <pubDate>${date}</pubDate>
  <dc:creator>${escapeXml(author)}</dc:creator>
  <description><![CDATA[${description}]]></description>
  <content:encoded><![CDATA[${post.html.substring(0, 2000)}]]></content:encoded>
  ${
    post.feature_image
      ? `<media:content url="${escapeXml(post.feature_image)}" medium="image" />`
      : ""
  }
</item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
 xmlns:content="http://purl.org/rss/1.0/components/content/"
 xmlns:media="http://search.yahoo.com/mrss/"
 xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>RateUp Blog</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>Latest insights on business reviews and customer feedback</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>`;
}

function escapeXml(str: string) {
  return (
    str
      ?.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;") || ""
  );
}

function stripHtml(html: string) {
  return (
    html
      ?.replace(/<(script|style)[^>]*>.*?<\/\1>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim()
      .substring(0, 300) || ""
  );
}
