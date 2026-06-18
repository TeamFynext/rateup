import { createFileRoute } from "@tanstack/react-router";

import { getAuthors, getPosts, getTags } from "@/lib/posts.ts";
import BlogApp from "@/components/blog/components/App.tsx";
import Layout from "@/components/RateupHomePage/Layout.tsx";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

export const Route = createFileRoute("/(marketing)/blog/")({
  loader: async () => {
    const [posts, authors, tags] = await Promise.all([
      getPosts(),
      getAuthors(),
      getTags(),
    ]);

    return { posts, authors, tags };
  },
  component: BlogIndex,
});

export const revalidate = 60;
export const metadata = {
  alternates: {
    types: {
      "application/rss+xml": "/blog/rss.xml",
    },
  },
};

function BlogIndex() {
  const { posts, authors, tags } = Route.useLoaderData();

  return (
    <Layout contentClassName={styles.themeBlog}>
      <BlogApp posts={posts} authors={authors} tags={tags} />
    </Layout>
  );
}
