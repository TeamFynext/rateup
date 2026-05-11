import TurndownService from "turndown";

import { getSinglePost } from "@/lib/posts";

const turndown = new TurndownService();

export async function getMarkdownContent(slug: string) {
  const post = await getSinglePost(slug);
  console.log("Fetching post:", slug);
  if (!post) return null;

  return turndown.turndown(post.html);
}
