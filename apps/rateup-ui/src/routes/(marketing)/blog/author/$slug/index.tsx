import { createFileRoute, notFound } from "@tanstack/react-router";

import BlogLayout from "@/components/blog/Layout.tsx";
import { noindexHead } from "@/lib/metadata.ts";
import { getPosts } from "@/lib/posts.ts";

import PostGrid from "../../../../../components/(marketing)/blog/post-grid.tsx";

export const Route = createFileRoute("/(marketing)/blog/author/$slug/")({
  component: Author,
  // Thin filtered listings of posts that are already indexed on their own URLs. `follow`
  // keeps the link equity flowing to the posts; the canonical points at the blog index.
  head: () => noindexHead("/blog"),
  loader: async ({ params }) => {
    const { slug } = params;
    if (!slug) throw notFound();
    const posts = await getPosts({ author: slug });
    if (!posts || posts.meta?.pagination.total === 0) throw notFound();
    return posts;
  },
});

function Author() {
  const posts = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <BlogLayout
      title="RateUp Blog"
      description="Latest insights on business reviews and customer feedback"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PostGrid activeAuthor={slug} posts={posts} />;
      </div>
    </BlogLayout>
  );
}
