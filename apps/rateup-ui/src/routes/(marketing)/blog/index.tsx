import { createFileRoute } from "@tanstack/react-router";

import BlogApp from "@/components/blog/components/App.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import { buildPageHead } from "@/lib/metadata.ts";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

export const Route = createFileRoute("/(marketing)/blog/")({
  loader: async () => {
    // Dynamic so the Ghost client stays out of the client entry — see blog/$slug.
    const { getAuthors, getPosts, getTags } = await import("@/lib/posts.ts");
    const [posts, authors, tags] = await Promise.all([getPosts(), getAuthors(), getTags()]);

    return { posts, authors, tags };
  },
  component: BlogIndex,
  // Lives here, not on a `blog/route.tsx` layout: a layout head applies to every child, and
  // TanStack concatenates `links`, so a layout canonical rendered a second `<link rel=canonical>`
  // to /blog on every post.
  head: () => buildPageHead("/blog"),
});

function BlogIndex() {
  const { posts, authors, tags } = Route.useLoaderData();

  return (
    <Layout contentClassName={styles.themeBlog}>
      <BlogApp posts={posts} authors={authors} tags={tags} />
    </Layout>
  );
}
