// lib/posts.js - or make a separate file to reuse for other resources
import GhostContentAPI from "@tryghost/content-api";

/**
 * Origin of the headless Ghost instance. Posts come back with `url`/`canonical_url` pointing at
 * this host, which serves `Disallow: /` — emitting either as a canonical de-indexes the post,
 * so `blog/$slug` canonicalises to rateup.app and only honours a `canonical_url` set elsewhere.
 */
export const GHOST_ORIGIN = "https://yellow-roadrunner.pikapod.net";

// Create API instance with site credentials
const api = new GhostContentAPI({
  url: GHOST_ORIGIN,
  key: "b459f625f38f60f854d72f834f",
  version: "v6.0",
});

/** Ghost's browse result: the posts, with pagination metadata attached to the array. */
export type PostsPage = Post[] & { meta?: { pagination: { total: number } } };

export interface Post {
  slug: string;
  id: string;
  uuid: string;
  title: string;
  html: string;
  comment_id: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  published_at: string;
  custom_excerpt: string;
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  custom_template: string | null;
  canonical_url: string | null;
  authors: Array<{
    id: string;
    name: string;
    slug: string;
    profile_image: string;
    cover_image: string | null;
    bio: string;
    website: string;
    location: string | null;
    facebook: string;
    twitter: string;
    meta_title: string | null;
    meta_description: string | null;
    url: string;
  }>;
  tags: Array<Tag>;
  primary_author: {
    id: string;
    name: string;
    slug: string;
    profile_image: string;
    cover_image: string | null;
    bio: string;
    website: string;
    location: string | null;
    facebook: string;
    twitter: string;
    meta_title: string | null;
    meta_description: string | null;
    url: string;
  };
  primary_tag: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    feature_image: string | null;
    visibility: string;
    meta_title: string | null;
    meta_description: string | null;
    url: string;
  };
  url: string;
  excerpt: string;
}
/**
 * The fields the list cards actually render.
 *
 * Without this Ghost returns every post's full rendered `html`, all 35 of which were then
 * dehydrated into `/blog` — a 1 MB HTML document for a page that shows titles and excerpts. The
 * post body is fetched per post by `getSinglePost`, which is the only place it is rendered.
 *
 * `include: tags,authors` still attaches `primary_tag`/`primary_author`, and `excerpt` is
 * derived by Ghost, so both survive the projection.
 */
const LIST_FIELDS =
  "id,slug,title,feature_image,feature_image_alt,published_at,updated_at,excerpt,custom_excerpt,url";

export async function getPosts(
  filter?: { tag?: string; author?: string },
  /** `full` keeps `html` — only the RSS feed needs it. */
  detail: "list" | "full" = "list",
) {
  let filterStr: string | undefined;
  if (filter?.tag) {
    filterStr = `tag:${filter.tag}`;
  } else if (filter?.author) {
    filterStr = `primary_author:${filter.author}`;
  }

  return (await api.posts
    .browse({
      limit: 35,
      include: "tags,authors",
      filter: filterStr,
      ...(detail === "list" ? { fields: LIST_FIELDS } : {}),
    })
    .catch((err: unknown) => {
      console.error(err);
    })) as PostsPage;
}

export async function getSinglePost(postSlug: string) {
  try {
    return (await api.posts.read({
      slug: postSlug,
      include: "tags,authors",
    })) as Post;
  } catch {
    return null;
  }
}

export interface Author {
  slug: string;
  id: string;
  name: string;
  profile_image: string;
  cover_image: string | null;
  bio: string;
  website: string;
  location: string;
  facebook: string;
  twitter: string;
  meta_title: string | null;
  meta_description: string | null;
  url: string;
}

export async function getAuthors() {
  return (await api.authors
    .browse({
      limit: 15,
    })
    .catch((err: unknown) => {
      console.error(err);
    })) as Array<Author>;
}

export interface Tag {
  slug: string;
  id: string;
  name: string;
  description: string | null;
  feature_image: string | null;
  visibility: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
  canonical_url: string | null;
  accent_color: string | null;
  url: string;
}
export async function getTags() {
  return (await api.tags
    .browse({
      limit: 15,
    })
    .catch((err: unknown) => {
      console.error(err);
    })) as Array<Tag>;
}
