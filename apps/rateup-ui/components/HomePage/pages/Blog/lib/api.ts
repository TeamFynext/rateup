import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import PostType from "../interfaces/post";
import dayjs from "dayjs";

const postsDirectory = join(
  process.cwd(),
  "./components/HomePage/pages/Blog/_posts",
);

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string, fields: string[] = []): PostType {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  type Items = {
    [key: string]: string;
  };

  const items: Partial<PostType> = {};

  fields.forEach((field) => {
    if (field === "slug") {
      items[field] = realSlug;
    }
    if (field === "content") {
      items[field] = content;
    }
    if (field === "coverImage") {
      items[field] = data[field];
    }
    if (field === "date") {
      items[field] = formatDate(data[field]);
    }
    if (typeof data[field] !== "undefined") {
      items[field] = data[field];
    }
  });

  return items as PostType;
}

export function getAllPosts(fields: string[] = []): PostType[] {
  const slugs = getPostSlugs();

  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))

    .filter((post) => post !== null) // Filter out posts that couldn't be loaded
    // sort posts by date in descending order
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

function formatDate(dateString: string): string {
  // Parse the date string with the correct format
  const date = dayjs(dateString, "DD/MM/YYYY");
  return date.format("MMMM DD, YYYY");
}
