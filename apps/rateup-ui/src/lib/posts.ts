// lib/posts.js - or make a separate file to reuse for other resources
import GhostContentAPI from "@tryghost/content-api";

// Create API instance with site credentials
const api = new GhostContentAPI({
  url: "https://yellow-roadrunner.pikapod.net",
  key: "b459f625f38f60f854d72f834f",
  version: "v6.0",
});

export type Post = {
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
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    feature_image: string | null;
    visibility: string;
    meta_title: string | null;
    meta_description: string | null;
    url: string;
  }>;
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
};
export async function getPosts(filter?: { tag?: string; author?: string }) {
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
    })
    .catch((err) => {
      console.error(err);
    })) as Array<Post>;
}

export async function getSinglePost(postSlug: string) {
  try {
    return (await api.posts.read({
      slug: postSlug,
      include: "tags,authors",
    })) as Post;
  } catch (_error) {
    return null;
  }
}

async function getPages() {
  return await api.pages
    .browse({
      limit: 15, // default is 15, max is 100
    })
    .catch((err) => {
      console.error(err);
    });
}

export type Author = {
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
};

export async function getAuthors() {
  return (await api.authors
    .browse({
      limit: 15,
    })
    .catch((err) => {
      console.error(err);
    })) as Array<Author>;
}

export type Tag = {
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
};
export async function getTags() {
  return (await api.tags
    .browse({
      limit: 15,
    })
    .catch((err) => {
      console.error(err);
    })) as Array<Tag>;
}
